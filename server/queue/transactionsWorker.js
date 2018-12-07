import amqp from 'amqplib';
import config from '../../config/config';
import Logger from '../globals/logger';
import TransactionService from '../services/transactionService';

export default class TransactionsWorker {

  constructor() {
    this.logger = new Logger();
    this.transactionService = new TransactionService();
  }

  /** Opens and returns Queue channel to wait for incoming
   * transactions to be consumed
  * @return {void}
  */
  async getAmqpChannel() {
    if (!this.amqpChannel) {
      this.logger.info('Initializing queue...');
      this.amqpConnection = await amqp.connect(config.queue.url);
      this.amqpChannel = await this.amqpConnection.createChannel();
    }
    return this.amqpChannel;
  }

  /** Sends data to fail queue when transactions are not parsed successfully
  * @param {Object} transaction - the transaction object to be sent to queue
  * @param {Object} channel - amqp initiated channel object
  * @return {void}
  */
 async sendToFailQueue(data) {
  this.logger.info('Sending transactions that somehow failed to parse to "Fail QUEUE"');
  const channel = await this.getAmqpChannel();
  await channel.assertQueue(config.queue.failTransactionQueue, { exclusive: false });
  channel.sendToQueue(config.queue.failTransactionQueue, data, { persistent: true });
}

  /** Opens Queue channel to wait for incoming transactions to be consumed
  * @return {void}
  */
  async consume() {
    // connecting to queue server
    const NO_TRANSACTIONS_ERROR = 'No transactions were found on queue message';
    const channel = await this.getAmqpChannel();
    const q = await channel.assertQueue(config.queue.transactionQueue, {
      exclusive: false,
      durable: true,
    });
    channel.prefetch(config.queue.prefetchSize);
    this.logger.info('Transactions Queue Worker has started.');
    channel.consume(q.queue, async (msg) => {
      try {
        const incomingTransactions = JSON.parse(msg.content);
        if (!incomingTransactions || incomingTransactions.length <= 0) {
          throw new Error(NO_TRANSACTIONS_ERROR);
        }
        for (const transaction of incomingTransactions) {
          const parsedTransaction = this.transactionService.parseTransaction(transaction);
          const sequencedTransaction = await this.transactionService.getSequencedTransactions(parsedTransaction);
          await this.transactionService.insertMultipleParsedTransactions(sequencedTransaction);
        }
        channel.ack(msg);
        this.logger.info('Transactions Parsed and inserted successfully');
      } catch (error) {
        channel.ack(msg);
        // as there is a prefetch, showing that there is no transactions
        // in the queue is polluting the logs, better skip it
        if (!error.toString().includes(NO_TRANSACTIONS_ERROR)) {
          this.logger.error(error);
        }
        this.sendToFailQueue(msg.content);
      }
    }, { noAck: false });
  }

}

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
      console.log('Initializing queue...');
      this.amqpConnection = await amqp.connect(config.queue.url);
      this.amqpChannel = await this.amqpConnection.createChannel();
    }
    return this.amqpChannel;
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
          const parsedTx = this.transactionService.parseTransaction(transaction);
          const parsedTransactions = await this.transactionService.getSequencedTransactions(parsedTx);
          await this.transactionService.insertMultipleParsedTransactions(parsedTransactions);
        }
        channel.ack(msg);
        this.logger.info('Transactions Parsed and inserted successfully');
      } catch (error) {
        channel.nack(msg);
        // as there is a prefetch, showing that there is no transactions
        // in the queue is polluting the logs, better skip it
        if (!error.toString().includes(NO_TRANSACTIONS_ERROR)) {
          this.logger.error(error);
        }
      }
    }, { noAck: false });
  }

}

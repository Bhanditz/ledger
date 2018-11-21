import amqp from 'amqplib';
import Promise from 'bluebird';
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
    const channel = await this.getAmqpChannel();
    const q = await channel.assertQueue(config.queue.transactionQueue, { exclusive: false });
    this.logger.info('Transactions Queue Worker has started.');
    channel.consume(q.queue, async (msg) => {
      try {
        const incomingTransactions = JSON.parse(msg.content);
        if (!incomingTransactions || incomingTransactions.length <= 0) {
          throw new Error('No transactions were found on queue message');
        }
        await Promise.map(incomingTransactions, (transaction) => {
          return this.transactionService.parseAndInsertTransaction(transaction);
        });
        this.logger.info('Transactions Parsed and inserted successfully');
      } catch (error) {
        this.logger.error(error);
      }
    }, { noAck: true });
  }

}

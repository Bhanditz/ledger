import amqp from 'amqplib';
import config from '../../config/config';
import Logger from '../globals/logger';
import TransactionService from '../services/transactionService';
import Database from '../models';

export default class TransactionsWorker {

  constructor() {
    this.logger = new Logger();
    this.transactionService = new TransactionService();
  }

  async sendToQueue(channel, transaction) {
    await channel.assertQueue(config.queue.transactionQueue, { exclusive: false });
    channel.sendToQueue(config.queue.transactionQueue, Buffer.from(JSON.stringify(transaction), 'utf8'));
  }

  /** Opens Queue channel to wait for incoming transactions to be consumed
  * @return {void}
  */
  async consume() {
    // getting db pools and connections
    const ledgerDatabase = new Database();
    const pool = ledgerDatabase.sequelize.connectionManager.pool;
    // connecting to queue server
    const conn = await amqp.connect(config.queue.url);
    const channel = await conn.createChannel();
    const q = await channel.assertQueue(config.queue.transactionQueue, { exclusive: false });
    this.logger.info('Transactions Queue Worker has started.');
    channel.consume(q.queue, async (msg) => {
      try {
        const incomingTransaction = JSON.parse(msg.content);
        await this.transactionService.parseAndInsertTransaction(incomingTransaction);
        this.logger.info('Transaction Parsed and inserted successfully');
      } catch (error) {
        this.logger.error(error);
        // if there is an error with a transaction, resend to queue
        // if (incomingTransaction) {
        //   this.logger.warn('Resending transaction to queue...');
        //   this.sendToQueue(channel, incomingTransaction);
        // }
      } finally {
        // releasing pool size
        pool.drain();
        pool.clear();
      }
    }, { noAck: true });
  }

}

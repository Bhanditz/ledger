import amqp from 'amqplib';
import { operationNotAllowed } from '../globals/errors';
import config from '../../config/config';
import Logger from '../globals/logger';
import TransactionService from '../services/transactionService';

export default class TransactionsWorker {

  constructor() {
    this.logger = new Logger();
    this.transactionService = new TransactionService();
  }

  /** Opens Queue channel to wait for incoming transactions to be consumed
  * @return {void}
  */
  async consume() {
    const conn = await amqp.connect(config.queue.url);
    const channel = await conn.createChannel();
    const q = await channel.assertQueue(config.queue.transactionQueue, { exclusive: true });
    this.logger.info('Transactions Queue Worker has started.');
    channel.consume(q.queue, async (msg) => {
      try {
        this.logger.info(` [x] ${msg.fields.routingKey}:'${msg.content.toString()}'`);
        const incomingTransaction = JSON.parse(msg.content);
        const parsedTransactions = await this.transactionService.parseAndInsertTransaction(incomingTransaction);
        this.logger.info(`Transaction Parsed and inserted successfully,
          list of generated transactions: ${JSON.stringify(parsedTransactions, null, 2)}`);
      } catch (error) {
        this.logger.error(error);
      }
    }, { noAck: true });
  }

}

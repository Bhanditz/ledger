import PgAsync from 'pg-async';
import amqp from 'amqplib';
import Database from '../../server/models';
import LedgerTransaction from '../../server/models/LedgerTransaction';
import config from '../../config/config';

/*
Migration, starts inserting by looking at the min id of the current prod's transaction table
and then insert on the ledger(keeping state through the ledger's transaction fields "LegacyCreditTransactionId" and "LegacyDebitTransactionId")
Use Cases that migration is NOT working at the moment:
  1. PaymentMethodId is null
    - select * from "Transactions" t WHERE "PaymentMethodId" is null;
    -- If PMID is null, it either has ExpenseId or OrderId
  2. PaymentMethods table has service stripe defined but does NOT have type creditcard(NULL) defined
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL;
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='paypal';
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='stripe';
  4. HostCollectiveId is null and/or hostCurrency is null(LegacyId 99531)
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."HostCollectiveId" is null and t."deletedAt" is null;
  6. Not a Problem, just a PS: Collectives with a currency that have Hosts with different currencies, In this case we are converting the fees that the collective paid in the host currency to the collective's currency. This may cause small differences on the result due to Math rounds.
    - WWcodeBerlin example: collective is EUR, host is USD, collective pays the fees in USD even though it's a EUR Collective.

    PS: Environment variable QUERY_LIMIT defines the size of the batch
    of transactions to be inserted at once.
*/
export class QueueStatefulMigration {

  constructor() {
  }

  /** Opens current prod database connection
  * @return {void}
  */
  async getProductionConnection() {
    if (!this.currentProdDbClient) {
      console.log('Initializing current production db...');
      this.currentProdDbClient = new PgAsync({
        user: config.database.username,
        password: config.database.password,
        host: config.database.host,
        database: config.database.database,
        port: config.database.port,
        ssl: config.database.sslMode,
      });
    }
    return this.currentProdDbClient;
  }

  /** Opens and returns Ledger database connection
  * @return {void}
  */
  getLedgerConnection() {
    if (!this.ledgerDbConnection) {
      console.log('Initializing Ledger db...');
      this.ledgerDbConnection = new Database();
    }
    return this.ledgerDbConnection;
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

  /** returns the latest Legacy Id inserted into the ledger database
  * @return {number}
  */
  async getLatestLegacyIdFromLedger() {
    if (!this.latestLegacyIdFromLedger) {
      this.latestLegacyIdFromLedger = await LedgerTransaction.max('LegacyCreditTransactionId');
    }
    return this.latestLegacyIdFromLedger && this.latestLegacyIdFromLedger > 0
      ? this.latestLegacyIdFromLedger
      : 0;
  }

  /** Sends data to queue
  * @param {Object} transaction - the transaction object to be sent to queue
  * @param {Object} channel - amqp initiated channel object
  * @return {void}
  */
  async sendToQueue(transactions) {
    const queryLimit = parseInt(process.env.QUERY_LIMIT) || 1;
    console.time(`Time to send ${queryLimit} transactions to queue:`);
    const channel = await this.getAmqpChannel();
    await channel.assertQueue(config.queue.transactionQueue, { exclusive: false });
    channel.sendToQueue(config.queue.transactionQueue,
      Buffer.from(JSON.stringify(transactions), 'utf8'), { persistent: true });
    console.timeEnd(`Time to send ${queryLimit} transactions to queue:`);
  }

  /** Parse transactions from Current production database(Transactions table)
   * to be sent to the Ledger Queue Consumer
  * @return {boolean}
  */
  async sendTransactionsToQueue() {
    const currentProdDbClient = await this.getProductionConnection();
    const latestLegacyIdFromLedger = await this.getLatestLegacyIdFromLedger();
    const queryLimit = parseInt(process.env.QUERY_LIMIT) || 1;
    console.log(`Inserting data starting from Legacy Id: ${latestLegacyIdFromLedger}`);
    const query = ` SELECT
      t.id, td.id as "debitId", t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency,
      t.description, t."hostFeeInHostCurrency", t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."OrderId",
      t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."hostCurrencyFxRate", t."RefundTransactionId",
      t."createdAt", t."updatedAt",
      f.slug as "fromCollectiveSlug",
      c.slug as "collectiveSlug",
      h.slug as "hostCollectiveSlug",
      p.service as "paymentMethodService",
      p.type as "paymentMethodType",
      p."SourcePaymentMethodId",
      pmc.id as "paymentMethodCollectiveId",
      pmc.slug as "paymentMethodCollectiveSlug",
      ofc.id as "orderFromCollectiveId",
      ofc.slug as "orderFromCollectiveSlug",
      opm.service as "orderPaymentMethodService",
      opm.type as "orderPaymentMethodType",
      opmc.id as "orderPaymentMethodCollectiveId",
      opmc.slug as "orderPaymentMethodCollectiveSlug",
      e."UserId" as "expenseUserId",
      e."CollectiveId" as "expenseCollectiveId",
      e."payoutMethod" as "expensePayoutMethod",
      ec.slug as "expenseCollectiveSlug",
      eu."paypalEmail" as "expenseUserPaypalEmail",
      euc.slug as "expenseUserCollectiveSlug"
      FROM "Transactions" t
      LEFT JOIN "Collectives" f on t."FromCollectiveId" =f.id and f."deletedAt" is null
      LEFT JOIN "Collectives" c on t."CollectiveId" =c.id and c."deletedAt" is null
      LEFT JOIN "Collectives" h on t."HostCollectiveId" =h.id and h."deletedAt" is null
      LEFT JOIN "PaymentMethods" p on t."PaymentMethodId"=p.id and p."deletedAt" is null
      LEFT JOIN "Collectives" pmc on p."CollectiveId" =pmc.id and pmc."deletedAt" is null
      LEFT JOIN "Expenses" e on t."ExpenseId" =e.id and e."deletedAt" is null
      LEFT JOIN "Collectives" ec on e."CollectiveId"=ec.id and ec."deletedAt" is null
      LEFT JOIN "Users" eu on e."UserId"=eu.id and eu."deletedAt" is null
      LEFT JOIN "Collectives" euc on eu."CollectiveId"=euc.id and euc."deletedAt" is null
      LEFT JOIN "Orders" o on t."OrderId"=o.id and o."deletedAt" is null
      LEFT JOIN "Collectives" ofc on o."FromCollectiveId"=ofc.id and ofc."deletedAt" is null
      LEFT JOIN "PaymentMethods" opm on o."PaymentMethodId"=opm.id and opm."deletedAt" is null
      LEFT JOIN "Collectives" opmc on opm."CollectiveId"=opmc.id  and opmc."deletedAt" is null
      LEFT JOIN "Transactions" td on t."TransactionGroup"=td."TransactionGroup" and td.type='DEBIT' and td."deletedAt" is null
      WHERE t.id>${latestLegacyIdFromLedger} and t.type=\'CREDIT\' and t."deletedAt" is null
      ORDER BY t.id ASC limit ${queryLimit};
    `; // WHERE t.id=XXXXXX and t."RefundTransactionId" is not null
    const res = await currentProdDbClient.query(query);

    if (!res || !res.rows || res.rows.length <= 0)
      console.error('No records were found');

    console.log(`res.rows: ${JSON.stringify(res.rows, null,2)}`);
    await this.sendToQueue(res.rows);
    const transactionLegacyIds = res.rows.map(t => t.id);
    this.latestLegacyIdFromLedger = Math.max(...transactionLegacyIds);
    console.log(`Latest Legacy Id inserted: ${this.latestLegacyIdFromLedger}`);
    return true;
  }

  async run() {
    try {
      this.getLedgerConnection();
      console.log('migrating single transaction...');
      await this.sendTransactionsToQueue();
      console.log('tx sent to queue...');
      this.run();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}
console.log('Initializing migration...');
const migration = new QueueStatefulMigration();
migration.run();

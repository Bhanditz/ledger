import PgAsync from 'pg-async';
import amqp from 'amqplib';
import Database from '../../server/models';
import LedgerTransaction from '../../server/models/LedgerTransaction';
import config from '../../config/config';
import Promise from 'bluebird';

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
*/
export class QueueStatefulMigration {

  constructor() {
  }

  async getLatestLegacyIdFromLedger() {
    const ledgerDatabase = new Database();
    const max = await LedgerTransaction.max('LegacyCreditTransactionId');
    const pool = ledgerDatabase.sequelize.connectionManager.pool;
    const connection = await pool.acquire();
    await pool.release(connection);
    await pool.drain();
    await pool.clear();
    return max || Number.MIN_SAFE_INTEGER;
  }

  async sendToQueue(transaction, channel) {
    await channel.assertQueue(config.queue.transactionQueue, { exclusive: false });
    channel.sendToQueue(config.queue.transactionQueue, Buffer.from(JSON.stringify(transaction), 'utf8'));
  }

  async sendSingleTransactionToQueue() {
    const currentProdDbClient = new PgAsync({
      user: process.env.MIGRATION_DB_USER || 'apple',
      host: process.env.MIGRATION_DB_HOST || 'localhost',
      database: process.env.MIGRATION_DB_NAME || 'opencollective_prod_snapshot',
      port: process.env.MIGRATION_DB_PORT || 5432,
    });
    const conn = await amqp.connect(config.queue.url);
    const channel = await conn.createChannel();
    const legacyId = await this.getLatestLegacyIdFromLedger();
    console.log(`legacyId: ${legacyId}`);
    const query = ` SELECT
      t.id, td.id as "debitId",t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency,
      t."hostFeeInHostCurrency", t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."OrderId",
      t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."hostCurrencyFxRate", t."RefundTransactionId",
      f.slug as "fromCollectiveSlug",
      c.slug as "collectiveSlug",
      h.slug as "hostCollectiveSlug",
      p.service as "paymentMethodService",
      p.type as "paymentMethodType",
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
      WHERE t.id>${legacyId} and t.type=\'CREDIT\' and t."deletedAt" is null
      ORDER BY t.id ASC limit ${process.env.QUERY_LIMIT || 1};
    `; // WHERE t.id=XXXXXX and t."RefundTransactionId" is not null
    const res = await currentProdDbClient.query(query);
    // closing pg connections
    await currentProdDbClient.closeConnections();
    if (!res || !res.rows || res.rows.length <= 0)
      console.error('No records were found');

    const rawTransactions = res.rows;
    console.log(`inserting ${rawTransactions.length} Raw Txs: ${JSON.stringify(rawTransactions, null,2)}`);
    await Promise.map(rawTransactions, (transaction) => {
      return this.sendToQueue(transaction, channel);
    });
    setTimeout(() => conn.close(), 250);
    return true;

  }

  timeout(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      console.log('migrating one more row...');
      await this.sendSingleTransactionToQueue();
      console.log('tx sent to queue...');
      setTimeout(this.run.bind(this), 100);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

}

const migration = new QueueStatefulMigration();
migration.run();

import PgAsync from 'pg-async';
import TransactionService from '../../server/services/transactionService';
import Database from '../../server/models';
import Transaction from '../../server/models/Transaction';

/*
Backward migration, starts inserting by looking at the max id of the current prod's transaction table
and then insert on the ledger(keeping state through the ledger's transaction field "LegacyTransactionId")
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
export class StatefulMigration {

  constructor() {
    this.ledgerDatabase = new Database();
  }

  async getLatestLegacyIdFromLedger() {
    const min = await Transaction.min('LegacyTransactionId');
    return min || Number.MAX_SAFE_INTEGER;
  }

  async migrateSingleTransaction() {
    const currentProdDbClient = new PgAsync({
      user: 'apple',
      host: 'localhost',
      database: 'opencollective_prod_snapshot',
      port: 5432,
    });
    const legacyId = await this.getLatestLegacyIdFromLedger();
    console.log(`legacyId: ${legacyId}`);
    const query = ` select 
    t.id, t."FromCollectiveId", t."CollectiveId", t."amountInHostCurrency", t."hostCurrency", t.amount, t.currency,
    t."hostFeeInHostCurrency", t."platformFeeInHostCurrency",t."paymentProcessorFeeInHostCurrency", t."OrderId",
    t."PaymentMethodId", t."HostCollectiveId", t."ExpenseId", t."hostCurrencyFxRate", 
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
    from "Transactions" t 
    left join "Collectives" f on t."FromCollectiveId" =f.id
    left join "Collectives" c on t."CollectiveId" =c.id
    left join "Collectives" h on t."HostCollectiveId" =h.id
    left join "PaymentMethods" p on t."PaymentMethodId"=p.id
    left join "Collectives" pmc on p."CollectiveId" =pmc.id
    left join "Expenses" e on t."ExpenseId" =e.id
    left join "Collectives" ec on e."CollectiveId"=ec.id
    left join "Users" eu on e."UserId"=eu.id
    left join "Collectives" euc on eu."CollectiveId"=euc.id
    left join "Orders" o on t."OrderId"=o.id
    left join "Collectives" ofc on o."FromCollectiveId"=ofc.id
    left join "PaymentMethods" opm on o."PaymentMethodId"=opm.id
    left join "Collectives" opmc on opm."CollectiveId"=opmc.id
    WHERE t.id<${legacyId} and t.type=\'CREDIT\' and t."deletedAt" is null
    order by t.id desc limit 1;
    `;
    const res = await currentProdDbClient.query(query);
    if (!res || !res.rows || res.rows.length <= 0)
      console.error('Now records were found');

    console.log(`Raw Txs: ${JSON.stringify(res.rows, null,2)}`);
    const rawTransaction = res.rows[0];
    try {
      const service = new TransactionService();
      const res = await service.parseAndInsertTransaction(rawTransaction);
      console.log(`raw transaction: ${JSON.stringify(rawTransaction, null,2)}`);
      return res;
    } catch (error) {
      throw error;
    }
  }

  async run() {
    try {
      console.log('migrating one more row...');
      const migratedTransaction = await this.migrateSingleTransaction();
      console.log(`MIGRATED tx: ${JSON.stringify(migratedTransaction, null,2)}`);
      setTimeout(this.run.bind(this), 500);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

}

const migration = new StatefulMigration();
migration.run();

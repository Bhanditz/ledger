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
  2. PaymentMethods table has service stripe defined but does NOT have type creditcard(NULL) defined
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL;
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='paypal';
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."PaymentMethodId" is not NULL and p.type is NULL and p.service='stripe';
  3. FromCollectiveId is null(LegacyId 100784)
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."FromCollectiveId" is null;
  4. HostCollectiveId is null and/or hostCurrency is null(LegacyId 99531)
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."HostCollectiveId" is null;
  5. FromCollectiveId is null and HostCollectiveId is null
    - select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."HostCollectiveId" is null and t."FromCollectiveId" is null;
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
    const res = await currentProdDbClient.query(
      'select t.*, p.service as "pmService", p."CollectiveId" as "pmCollectiveId", p.type as "pmType"'+
      ' from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id' +
      ` WHERE t.id<${legacyId} and t.type=\'CREDIT\' and t."PaymentMethodId" is not null` +
      ' and t."FromCollectiveId" is not null and t."HostCollectiveId" is not null ' +
      ' and p.service is not null and p.type is not null and t."deletedAt" is null'+
      ' order by t.id desc limit 1;'
    );
    if (!res || !res.rows || res.rows.length <= 0)
      console.error('Now records were found');

    console.log(`Raw Txs: ${JSON.stringify(res.rows, null,2)}`);
    const formattedLedgerTransaction = res.rows.map(transaction => {
      return {
        FromAccountId: transaction.FromCollectiveId, // `${transaction.FromCollectiveId}(${transaction.fromCollectiveName})`,
        fromWallet: {
          name: transaction.PaymentMethodId, // Same name
          currency: transaction.hostCurrency,
          AccountId: transaction.FromCollectiveId,
          OwnerAccountId: transaction.pmCollectiveId, // We consider the Owner of the wallet The Owner of the payment method
        },
        ToAccountId:  transaction.CollectiveId, // `${transaction.CollectiveId}(${transaction.collectiveName})`,
        toWallet: {
          name: `${transaction.hostSlug}_${transaction.collectiveSlug}`,
          currency: transaction.currency,
          AccountId: transaction.CollectiveId,
          OwnerAccountId: transaction.HostCollectiveId,
        },
        amount: transaction.amountInHostCurrency,
        currency: transaction.hostCurrency,
        destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
        destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
        walletProviderFee: Math.round(-1 * transaction.hostFeeInHostCurrency/transaction.hostCurrencyFxRate),
        WalletProviderAccountId:  transaction.HostCollectiveId, // `${transaction.HostCollectiveId}(${transaction.hostName})`,
        walletProviderWallet: {
          name: transaction.HostCollectiveId,
          currency: null,
          AccountId: transaction.HostCollectiveId,
          OwnerAccountId: transaction.HostCollectiveId,
        },
        platformFee: Math.round(-1 * transaction.platformFeeInHostCurrency/transaction.hostCurrencyFxRate),
        paymentProviderFee: Math.round(-1 * transaction.paymentProcessorFeeInHostCurrency/transaction.hostCurrencyFxRate),
        PaymentProviderAccountId: transaction.pmService, // PaymentMethod.service
        paymentProviderWallet: {
          name: transaction.pmType, // PaymentMethod.type
          currency: null,
          AccountId: transaction.pmService,
          OwnerAccountId: transaction.pmService,
        },
        LegacyTransactionId: transaction.id,
      };
    })[0];
    console.log(`formattedLedgerTransaction: ${JSON.stringify(formattedLedgerTransaction, null,2)}`);
    const service = new TransactionService();
    try {
      const res = await service.insert(formattedLedgerTransaction);
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

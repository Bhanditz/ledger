import PgAsync from 'pg-async';
import TransactionService from '../../server/services/transactionService';
import Database from '../../server/models';
import Transaction from '../../server/models/Transaction';

/*
Backward migration, starts inserting by looking at the max id of the current prod's transaction table
and then insert on the ledger(keeping state through the ledger's transaction field "LegacyTransactionId")
Use Cases that migration is NOT working at the moment:
  1. PaymentMethodId is null
  2. PaymentMethods table has service stripe defined but does NOT have type creditcard(NULL) defined
  3. FromCollectiveId is null(LegacyId 100784)
  4. HostCollectiveId is null and/or hostCurrency is null(LegacyId 99531)
  5. WWcodeBerlin example: collective is EUR, host is USD, collective pays the fees
     but collective pays it in USD even though it's a host
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
      'select t.*, p.service as "pmService", p.type as "pmType"'+
      ' from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id' +
      ` WHERE t.id<${legacyId} and t.type=\'CREDIT\' and t."PaymentMethodId" is not null` +
      ' and t."FromCollectiveId" is not null and t."HostCollectiveId" is not null ' +
      ' and p.service is not null and p.type is not null'+
      ' order by t.id desc limit 1;'
    );
    if (!res || !res.rows || res.rows.length <= 0)
      console.error('Now records were found');

    console.log(`Raw Txs: ${JSON.stringify(res.rows, null,2)}`);
    const formattedLedgerTransaction = res.rows.map(transaction => {
      return {
        FromAccountId: transaction.FromCollectiveId, // `${transaction.FromCollectiveId}(${transaction.fromCollectiveName})`,
        FromWalletName: transaction.PaymentMethodId,
        ToAccountId:  transaction.CollectiveId, // `${transaction.CollectiveId}(${transaction.collectiveName})`,
        ToWalletName: `${transaction.CollectiveId}_${transaction.HostCollectiveId}`, // Create a payment method
        amount: transaction.amountInHostCurrency,
        currency: transaction.hostCurrency,
        destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
        destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
        walletProviderFee: Math.round(-1 * transaction.hostFeeInHostCurrency/transaction.hostCurrencyFxRate),
        WalletProviderAccountId:  transaction.HostCollectiveId, // `${transaction.HostCollectiveId}(${transaction.hostName})`,
        WalletProviderWalletName: transaction.HostCollectiveId,
        platformFee: Math.round(-1 * transaction.platformFeeInHostCurrency/transaction.hostCurrencyFxRate),
        paymentProviderFee: Math.round(-1 * transaction.paymentProcessorFeeInHostCurrency/transaction.hostCurrencyFxRate),
        PaymentProviderAccountId: transaction.pmService, // PaymentMethod.service
        PaymentProviderWalletName: transaction.pmType, // PaymentMethod.type
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

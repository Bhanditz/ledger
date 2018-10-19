import { Client } from 'pg';
import TransactionService from '../../server/services/transactionService';

const client = new Client({
  user: 'apple',
  host: 'localhost',
  database: 'opencollective_prod_snapshot',
  // password: 'secretpassword',
  port: 5432,
});

client.connect();
// select t."FromCollectiveId" as "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" as "FromWalletId", t."CollectiveId" as "ToAccountId", t."CollectiveId" || '_Wallet' as "ToWalletId", t.amount, t.currency, t."amountInHostCurrency" as "destinationAmount", t."hostCurrency" as "destinationCurrency", t."hostFeeInHostCurrency" as "walletProviderFee", t."HostCollectiveId" as "WalletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" as "WalletProviderWalletId", t."platformFeeInHostCurrency" as "platformFee", t."paymentProcessorFeeInHostCurrency" as "paymentProviderFee", p.service as "PaymentProviderAccountId", p.service as "PaymentProviderWalletId", t."hostCurrencyFxRate" as fxRate, t.id as "LegacyTransactionId" from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='9d7ad496-55c3-4934-8472-780c152ade88' and t.type='CREDIT';
// client.query('select t."FromCollectiveId" as "FromAccountId", t."FromCollectiveId" || \'_\' || t."PaymentMethodId" as "FromWalletId", t."CollectiveId" as "ToAccountId", t."CollectiveId" || \'_Wallet\' as "ToWalletId", t.amount, t.currency, t."amountInHostCurrency" as "destinationAmount", t."hostCurrency" as "destinationCurrency", t."hostFeeInHostCurrency" as "walletProviderFee", t."HostCollectiveId" as "WalletProviderAccountId", t."HostCollectiveId" || \'_\' || t."PaymentMethodId" as "WalletProviderWalletId", t."platformFeeInHostCurrency" as "platformFee", t."paymentProcessorFeeInHostCurrency" as "paymentProviderFee", p.service as "PaymentProviderAccountId", p.service as "PaymentProviderWalletId", t."hostCurrencyFxRate" as fxRate, t.id as "LegacyTransactionId" from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"=\'9d7ad496-55c3-4934-8472-780c152ade88\' and t.type=\'CREDIT\';', (err, res) => {

// REGULAR Tx  -> "TransactionGroup"=\'e15f226d-1884-454c-a66c-3e2acc590ccc\'
// client.query('select t.*, p.service as "pmService", p.type as "pmType", c.name as "collectiveName", f.name as "fromCollectiveName", h.name as "hostName"'+
//             ' from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id' +
//             ' left join "Collectives" c on t."CollectiveId"=c.id' +
//             ' left join "Collectives" f on t."FromCollectiveId"=f.id' +
//             ' left join "Collectives" h on t."HostCollectiveId"=h.id' +
//             ' WHERE "TransactionGroup"=\'e15f226d-1884-454c-a66c-3e2acc590ccc\' and t.type=\'CREDIT\';', (err, res) => {
// FOREX Tx -> "TransactionGroup"=\'9d7ad496-55c3-4934-8472-780c152ade88\'
client.query('select t.*, p.service as "pmService", p.type as "pmType", c.name as "collectiveName", f.name as "fromCollectiveName", h.name as "hostName"'+
            ' from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id' +
            ' left join "Collectives" c on t."CollectiveId"=c.id' +
            ' left join "Collectives" f on t."FromCollectiveId"=f.id' +
            ' left join "Collectives" h on t."HostCollectiveId"=h.id' +
            ' WHERE "TransactionGroup"=\'9d7ad496-55c3-4934-8472-780c152ade88\' and t.type=\'CREDIT\';', (err, res) => {
  if (err) console.error(err, res);
  if (!res || !res.rows || res.rows.length <= 0) console.error('Now records were found');
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
  service.insert(formattedLedgerTransaction)
  .then(res => {
    console.log(`MIGRATED tx: ${JSON.stringify(res, null,2)}`);
    client.end();
    process.exit(0);
  })
  .catch(error => {
    console.error(error);
    client.end();
    process.exit(1);
  });
});


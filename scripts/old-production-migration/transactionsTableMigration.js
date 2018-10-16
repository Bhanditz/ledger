import { Client } from 'pg';

const client = new Client({
  user: 'apple',
  host: 'localhost',
  database: 'opencollective_prod_snapshot',
  // password: 'secretpassword',
  port: 5432,
});

client.connect();
// select t."FromCollectiveId" as "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" as "FromWalletId", t."CollectiveId" as "ToAccountId", t."CollectiveId" || '_Wallet' as "ToWalletId", t.amount, t.currency, t."amountInHostCurrency" as "destinationAmount", t."hostCurrency" as "destinationCurrency", t."hostFeeInHostCurrency" as "walletProviderFee", t."HostCollectiveId" as "walletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" as "walletProviderWalletId", t."platformFeeInHostCurrency" as "platformFee", t."paymentProcessorFeeInHostCurrency" as "paymentProviderFee", p.service as "paymentProviderAccountId", p.service as "paymentProviderWalletId", t.id as "LegacyTransactionId" from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='9d7ad496-55c3-4934-8472-780c152ade88' and t.type='CREDIT';
client.query('SELECT * FROM "Transactions" where type=\'CREDIT\' limit 10', (err, res) => {
  console.error(err, res);
  client.end();
});


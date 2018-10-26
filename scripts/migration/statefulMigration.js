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
    const formattedLedgerTransaction = res.rows.map(transaction => {
      // We define all properties of the new ledger here, except for all wallets(from, to, and fees)
      // and the WalletProvider and PaymentProvider Account ids
      const hostCurrency = transaction.hostCurrency || transaction.currency;
      const amountInHostCurrency = transaction.amountInHostCurrency || transaction.amount;
      // Fees are negative in DEBIT transactions...
      const hostFeeInHostCurrency = -1 * transaction.hostFeeInHostCurrency;
      const platformFeeInHostCurrency = -1 * transaction.platformFeeInHostCurrency;
      const paymentProcessorFeeInHostCurrency = -1 * transaction.paymentProcessorFeeInHostCurrency;
      const ledgerTransaction = {
        FromAccountId: transaction.FromCollectiveId,
        ToAccountId:  transaction.CollectiveId,
        amount: amountInHostCurrency,
        currency: hostCurrency,
        // destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
        // destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
        walletProviderFee: hostFeeInHostCurrency,
        platformFee: platformFeeInHostCurrency,
        paymentProviderFee: paymentProcessorFeeInHostCurrency,
        LegacyTransactionId: transaction.id,
        forexRate: transaction.hostCurrencyFxRate,
      };
      // setting toWallet
      ledgerTransaction.toWallet = {
        currency: hostCurrency,
        AccountId: transaction.CollectiveId,
      };
      if (transaction.HostCollectiveId) {
        // setting toWallet properties
        ledgerTransaction.toWallet.name = `owner: ${transaction.hostCollectiveSlug}, account: ${transaction.collectiveSlug}, ${hostCurrency}`;
        ledgerTransaction.toWallet.OwnerAccountId = transaction.HostCollectiveId;
        // if there is HostCollectiveId and hostFeeInHostCurrency, so we add the Wallet Provider
        // according to the Host Collective properties
        if (hostFeeInHostCurrency > 0) {
          ledgerTransaction.walletProviderFee = hostFeeInHostCurrency;
          ledgerTransaction.WalletProviderAccountId = transaction.HostCollectiveId;
          ledgerTransaction.walletProviderWallet = {
            name: `owner and account: ${transaction.hostCollectiveSlug}, multi-currency`,
            currency: null,
            AccountId: transaction.HostCollectiveId,
            OwnerAccountId: transaction.HostCollectiveId,
          };
        }
      } else {
        // setting toWallet properties in case there's no host fees
        ledgerTransaction.toWallet.name = `owner: ${transaction.collectiveSlug}, account: ${transaction.collectiveSlug}, ${hostCurrency}`;
        ledgerTransaction.toWallet.OwnerAccountId = transaction.CollectiveId;
        // if there is No HostCollectiveId but there ishostFeeInHostCurrency,
        // We add the wallet provider through either the ExpenseId or OrderId
        if (hostFeeInHostCurrency > 0) {
          ledgerTransaction.walletProviderFee = hostFeeInHostCurrency;
          if (transaction.ExpenseId) {
            // setting toWallet properties in case there's host fees through an Expense
            ledgerTransaction.toWallet.name = `owner: ${transaction.expensePayoutMethod}(through ${transaction.expenseUserPaypalEmail}), account: ${transaction.collectiveSlug}, ${hostCurrency}`;
            ledgerTransaction.toWallet.OwnerAccountId = `payment method: ${transaction.expensePayoutMethod}, paypal email: ${transaction.expenseUserPaypalEmail}`;
            // setting wallet provider wallet
            ledgerTransaction.WalletProviderAccountId = `payment method: ${transaction.expensePayoutMethod}, paypal email: ${transaction.expenseUserPaypalEmail}`;
            ledgerTransaction.walletProviderWallet = {
              name: `owner and account: ${transaction.expensePayoutMethod}(through ${transaction.expenseUserPaypalEmail}), multi-currency`,
              currency: transaction.expenseCurrency,
              AccountId: `payment method: ${transaction.expensePayoutMethod}, paypal email: ${transaction.expenseUserPaypalEmail}`,
              OwnerAccountId: `payment method: ${transaction.expensePayoutMethod}, paypal email: ${transaction.expenseUserPaypalEmail}`,
            };
          } else { // Order
            // setting toWallet properties in case there's host fees through an Expense
            ledgerTransaction.toWallet.name = `owner: ${transaction.orderPaymentMethodCollectiveSlug}(Order), account: ${transaction.collectiveSlug}, ${hostCurrency}`;
            ledgerTransaction.toWallet.OwnerAccountId = `${transaction.orderPaymentMethodCollectiveSlug}(Order)`;
            // setting wallet provider wallet
            ledgerTransaction.WalletProviderAccountId = `${transaction.orderPaymentMethodCollectiveSlug}(Order)`;
            ledgerTransaction.walletProviderWallet = {
              name: `owner and account: ${transaction.orderPaymentMethodCollectiveSlug}(Order), multi-currency`,
              currency: null,
              AccountId: `${transaction.orderPaymentMethodCollectiveSlug}(Order)`,
              OwnerAccountId: `${transaction.orderPaymentMethodCollectiveSlug}(Order)`,
            };
          }
        }
      }
      // setting fromWallet
      ledgerTransaction.fromWallet = {
        name: '',
        currency: hostCurrency,
        AccountId: transaction.FromCollectiveId,
        PaymentMethodId: transaction.PaymentMethodId || null,
        ExpenseId: transaction.ExpenseId || null,
        OrderId: transaction.OrderId || null,
      };
      // setting from and payment provider wallets
      if (transaction.PaymentMethodId) {
        ledgerTransaction.fromWallet.name = `owner: ${transaction.paymentMethodCollectiveSlug}, account: ${transaction.fromCollectiveSlug}, ${hostCurrency}`;
        ledgerTransaction.fromWallet.OwnerAccountId = transaction.paymentMethodCollectiveId;
        // creating Payment Provider wallet
        ledgerTransaction.PaymentProviderAccountId = transaction.paymentMethodService;
        ledgerTransaction.paymentProviderWallet = {
          name: transaction.paymentMethodType,
          currency: null,
          AccountId: transaction.paymentMethodService,
          OwnerAccountId: transaction.paymentMethodService,
          PaymentMethodId: transaction.PaymentMethodId,
        };
      } else if (transaction.ExpenseId) {
        ledgerTransaction.fromWallet.name = `owner: ${transaction.expenseCollectiveSlug}, account: ${transaction.fromCollectiveSlug}, ${hostCurrency}`;
        ledgerTransaction.fromWallet.OwnerAccountId = transaction.expenseCollectiveId;
        ledgerTransaction.PaymentProviderAccountId = transaction.expensePayoutMethod;
        ledgerTransaction.paymentProviderWallet = {
          name: `owner and account: ${transaction.expensePayoutMethod}, multi-currency`,
          currency: null,
          AccountId: transaction.expensePayoutMethod,
          OwnerAccountId: transaction.expensePayoutMethod,
          ExpenseId: transaction.ExpenseId,
        };
      } else { // If there is no PaymentMethodId nor ExpenseId, there will be OrderId
        // Order has PaymentMethod, then the slug will come from the transaction.order.paymentmethod
        // otherwise we will consider transaction.order.fromCollective as the owner
        if (transaction.orderPaymentMethodCollectiveSlug) {
          ledgerTransaction.fromWallet.name = `owner: ${transaction.orderPaymentMethodCollectiveSlug}, account: ${transaction.fromCollectiveSlug}, ${hostCurrency}`;
          ledgerTransaction.fromWallet.OwnerAccountId = transaction.orderPaymentMethodCollectiveId;
          ledgerTransaction.PaymentProviderAccountId = `${transaction.orderPaymentMethodCollectiveId}_${transaction.orderPaymentMethodService}_${transaction.orderPaymentMethodType}`;
          ledgerTransaction.paymentProviderWallet = {
            name: `account and owner:${transaction.orderPaymentMethodCollectiveId}, service: ${transaction.orderPaymentMethodService}, type: ${transaction.orderPaymentMethodType}`,
            currency: null,
            AccountId: `${transaction.orderPaymentMethodCollectiveId}_${transaction.orderPaymentMethodService}_${transaction.orderPaymentMethodType}`,
            OwnerAccountId: `${transaction.orderPaymentMethodCollectiveId}_${transaction.orderPaymentMethodService}_${transaction.orderPaymentMethodType}`,
            OrderId: transaction.OrderId,
          };
        } else {
          ledgerTransaction.fromWallet.name = `owner: ${transaction.orderFromCollectiveSlug}, account: ${transaction.fromCollectiveSlug}, ${hostCurrency}`;
          ledgerTransaction.fromWallet.OwnerAccountId = transaction.orderFromCollectiveId;
          ledgerTransaction.PaymentProviderAccountId = `${transaction.orderFromCollectiveId}_${transaction.OrderId}`;
          ledgerTransaction.paymentProviderWallet = {
            name: `from ${transaction.orderFromCollectiveSlug}(Order id ${transaction.OrderId})`,
            currency: null,
            AccountId: `${transaction.orderFromCollectiveId}_${transaction.OrderId}`,
            OwnerAccountId: `${transaction.orderFromCollectiveId}_${transaction.OrderId}`,
            OrderId: transaction.OrderId,
          };
        }
      }
      return ledgerTransaction;
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

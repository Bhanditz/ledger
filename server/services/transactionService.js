import AbstractCrudService from './abstractCrudService';
import LedgerTransaction from '../models/LedgerTransaction';
import TransactionRegularStrategy from '../strategies/transactionRegularStrategy';
import TransactionForexStrategy from '../strategies/transactionForexStrategy';
import TransactionRefundStrategy from '../strategies/transactionRefundStrategy';
import TransactionForexRefundStrategy from '../strategies/transactionForexRefundStrategy';

export default class TransactionService extends AbstractCrudService {

  constructor() {
    super(LedgerTransaction);
  }

  /** Given a transaction, identify which kind of transaction it will be and
  **  persists the group of transactions it will generate
  * @param {Object} incomingTransaction - transaction
  * @return {Array} containing the original incoming transaction + its double entry equivalent.
  */
  async insert(data) {
    // the strategy will return an array of transactions already formatted for the db
    const strategy = await this._defineTransactionStrategy(data);
    const transactions = await strategy.getTransactions();
    // adding transactionGroupSequence to the batch of transactions
    for (const index in transactions) {
    transactions[index].transactionGroupSequence = parseInt(index);
    }
    // Creating a Sequelize "Managed transaction" which automatically commits
    // if all transactions are done or rollback if any of them fail.
    return this.database.sequelize.transaction( t => {
        return this.model.bulkCreate(transactions, { transaction: t });
    }).then( result => {
      this.logger.info('Transactions created successfully');
      return result;
    }).catch( error => {
      this.logger.error('Rolling Back Transactions', error);
      throw error;
    });
  }


  /** Given a transaction, return the related "strategy" Object
  * @param {Object} incomingTransaction - transaction
  * @return {Object} strategy - Return defined Strategy Class Object
  */
  async _defineTransactionStrategy(transaction) {
    // Check if it is NOT a foreign exchange Transaction
    if (!transaction.destinationCurrency || transaction.destinationCurrency === transaction.currency) {
      // Check whether it's a REFUND transaction
      if (transaction.RefundTransactionId && transaction.LegacyCreditTransactionId &&
        transaction.LegacyCreditTransactionId > transaction.RefundTransactionId) {
        return new TransactionRefundStrategy(transaction);
      }
      return new TransactionRegularStrategy(transaction);
    }
    // Check whether the forex Transaction is also a REFUND transaction
    if (transaction.RefundTransactionId && transaction.LegacyCreditTransactionId &&
      transaction.LegacyCreditTransactionId > transaction.RefundTransactionId) {
      return new TransactionForexRefundStrategy(transaction);
    }
    return new TransactionForexStrategy(transaction);
  }

  /**
   * Parse incoming transaction to be formatted as a Ledger transaction
   * and then insert transaction into ledger database
   * @param {Object} transaction - Object base on the current Transaction model(https://github.com/opencollective/opencollective-api/blob/master/server/models/Transaction.js)
   */
  parseAndInsertTransaction(transaction) {
    const parsedTransaction = this.parseTransaction(transaction);
    return this.insert(parsedTransaction);
  }

  /**
   * Parse incoming transaction to be formatted as a Ledger transaction considering the
   * current Transaction model of the opencollective-api project
   * @param {Object} transaction - Object base on the current Transaction model(https://github.com/opencollective/opencollective-api/blob/master/server/models/Transaction.js)
   */
  parseTransaction(transaction) {
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
        amount: transaction.amount,
        currency: transaction.currency,
        destinationAmount: amountInHostCurrency, // ONLY for FOREX transactions(currency != hostCurrency)
        destinationCurrency: hostCurrency, // ONLY for FOREX transactions(currency != hostCurrency)
        walletProviderFee: hostFeeInHostCurrency,
        platformFee: platformFeeInHostCurrency,
        paymentProviderFee: paymentProcessorFeeInHostCurrency,
        LegacyCreditTransactionId: transaction.id,
        LegacyDebitTransactionId: transaction.debitId,
        forexRate: transaction.hostCurrencyFxRate,
        forexRateSourceCoin: transaction.currency,
        forexRateDestinationCoin: transaction.hostCurrency,
        description: transaction.description,
        RefundTransactionId: transaction.RefundTransactionId,
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
        if (hostFeeInHostCurrency) {
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
        if (hostFeeInHostCurrency) {
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
      // setting base of fromWallet
      ledgerTransaction.fromWallet = {
        name: '',
        currency: transaction.currency,
        AccountId: transaction.FromCollectiveId,
        PaymentMethodId: transaction.PaymentMethodId || null,
        ExpenseId: transaction.ExpenseId || null,
        OrderId: transaction.OrderId || null,
      };
      // setting from and payment provider wallets through one of the following:
      // PaymentMethodId or ExpenseId or OrderId, respectively
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
      } else {
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
  }

}

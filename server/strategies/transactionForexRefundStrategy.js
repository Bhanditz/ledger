import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import ForexToAccountConvertTransactions from '../lib/forexToAccountConvertTransactions';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';

export default class TransactionForexRefundStrategy  extends AbstractTransactionForexStrategy {
  constructor(transaction) {
    super(transaction);
  }

  async getTransactions() {
    await this.findOrCreateWallets(false);
    console.log(`REFUND TRANSACTION this.incomingTransaction: ${JSON.stringify(this.incomingTransaction, null,2)}`);
    // setting account to account transactions
    const transactionWithToWalletInSourceCurrency = {
      ...this.incomingTransaction,
      FromAccountId: this.incomingTransaction.ToAccountId,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromWalletId: this.incomingTransaction.toWalletSourceCurrency.id,
      ToWalletId: this.incomingTransaction.FromWalletId,
    };
    const accountToAccountlDestinationCurrencyTransactions = this.transactionLib.getDoubleEntryArray(transactionWithToWalletInSourceCurrency)
    .map(transaction => {
      transaction.category = `REFUND: ${transactionCategoryEnum.ACCOUNT}`;
      return transaction;
    });
    // setting fee transactions
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    const refundConversionTransaction = {
      ...this.incomingTransaction,
      amount: this.incomingTransaction.destinationAmount,
      currency: this.incomingTransaction.destinationCurrency,
      destinationAmount: this.incomingTransaction.amount,
      destinationCurrency: this.incomingTransaction.currency,
      toWalletSourceCurrency: { id: this.incomingTransaction.ToWalletId },
      ToWalletId: this.incomingTransaction.toWalletSourceCurrency.id,
    };
    // setting conversion Transactions
    const conversionTransactionsManager = new ForexToAccountConvertTransactions(refundConversionTransaction);
    const conversionTransactions = conversionTransactionsManager.getForexDoubleEntryTransactions()
    .map(transaction => {
      transaction.category = `REFUND: ${transactionCategoryEnum.CURRENCY_CONVERSION}`;
      return transaction;
    });

    // if senderPayFees, he will discount the fees from the total amount to send the net amount to the receiver
    // otherwise the sender will send the full amount and the receiver will pay the fees
    if (this.incomingTransaction.senderPayFees) {
      // calculating netAmount of the regular transaction
      this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    }
    let feeTransactions = [];
    if (paymentProviderFeeTransactions) {
      // Add Payment Provider Fee transactions to transactions array
      feeTransactions = feeTransactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());
    }
    if (platformFeeTransactions) {
      // Add Platform Fee transactions to transactions array
      feeTransactions = feeTransactions.concat(platformFeeTransactions.getFeeDoubleEntryTransactions());
    }
    if (providerFeeTransactions) {
      // Add Wallet Provider Fee transactions to transactions array
    feeTransactions = feeTransactions.concat(providerFeeTransactions.getFeeDoubleEntryTransactions());
    }
    feeTransactions = feeTransactions.map(transaction => {
      transaction.category = `REFUND: ${transaction.category}`;
      return transaction;
    });

    return [...feeTransactions, ...conversionTransactions, ...accountToAccountlDestinationCurrencyTransactions];
  }
}

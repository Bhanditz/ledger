import AbstractTransactionStrategy from './abstractTransactionStrategy';

export default class TransactionRegularStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async getTransactions() {
    // get balance through the field FromWalletId
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If the wallet balance has enough money to do the transaction, then creates just a zero-fee transaction
    if ( fromWalletBalance >= this.incomingTransaction.amount) {
      return this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    }
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    // calculating netAmount of the regular transaction
    this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    // create initial transactions after having a net amount(total amount - fees)
    const initialTransactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee(initialTransactions, paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
  }

}

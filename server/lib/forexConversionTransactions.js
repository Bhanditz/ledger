import TransactionLib from './transactionLib';

export default class ForexConversionTransactions {

  constructor(transaction){
    this.transaction = transaction;
    this.transactionLib = new TransactionLib();
  }

  /** Given a Transaction Returns all Double Entry transactions
  * @return {Array} of transactions
  */
  getForexDoubleEntryTransactions (){
    const sourceCurrencyTransactions = this._getSourceCurrencyDoubleEntryTransactions();
    const destinationCurrencyTransactions = this._getDestinationCurrencyDoubleEntryTransactions();
    return [...sourceCurrencyTransactions, ...destinationCurrencyTransactions];
  }

  _getSourceCurrencyDoubleEntryTransactions (){
    return this._getDoubleEntryTransactions(
      this.transaction.FromAccountId, this.transaction.FromWalletId, this.transaction.paymentProviderWallet.OwnerAccountId,
      this.transaction.paymentProviderWallet.id, this.transaction.amount, this.transaction.currency
    );
  }

  _getDestinationCurrencyDoubleEntryTransactions (){
    return this._getDoubleEntryTransactions(
      this.transaction.paymentProviderWallet.OwnerAccountId, this.transaction.paymentProviderWallet.id,
      this.transaction.FromAccountId, this.transaction.fromWalletDestinationCurrency.id,
      this.transaction.destinationAmount, this.transaction.destinationCurrency
    );
  }

  _getDoubleEntryTransactions (fromAccountId, fromWalletId, toAccountId, toWalletId, amount, currency) {
    const conversionTransaction = {
      FromAccountId: fromAccountId,
      FromWalletId: fromWalletId,
      ToAccountId: toAccountId,
      ToWalletId: toWalletId,
      amount: amount,
      currency: currency,
      forexRate: this.transaction.forexRate,
      forexRateSourceCoin: this.transaction.forexRateSourceCoin,
      forexRateDestinationCoin: this.transaction.forexRateDestinationCoin,
      transactionGroupId: this.transaction.transactionGroupId,
      LegacyTransactionId: this.transaction.LegacyTransactionId,
    };
    return this.transactionLib.getDoubleEntryArray(conversionTransaction);
  }
}

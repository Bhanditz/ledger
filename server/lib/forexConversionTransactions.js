import TransactionLib from '../transactionLib';
import { operationNotAllowed } from '../../globals/errors';

export default class ForexSourceCurencyConversionTransactions {

  constructor(transaction){
    this.transaction = transaction;
    this.transactionLib = new TransactionLib();
  }

  /** Given a Transaction Returns all Double Entry transactions
  * @return {Array} of transactions
  */
  getForexDoubleEntryTransactions (){
    const sourceCurrencyTransactions = this._getSourceCurrencyDoubleEntryTransactions();
    this.transaction.transactionGroupSequence++;
    const destinationCurrencyTransactions = this._getDestinationCurrencyDoubleEntryTransactions();
    return [...sourceCurrencyTransactions, destinationCurrencyTransactions];
  }

  _getSourceCurrencyDoubleEntryTransactions (){
    return this._getDoubleEntryTransactions(
      this.transaction.FromAccountId, this.transaction.FromWalletId, this.transaction.paymentProvider.OwnerAccountId,
      this.transaction.paymentProviderWalletId, this.transaction.amount, this.transaction.currency
    );
  }

  _getDestinationCurrencyDoubleEntryTransactions (){
    return this._getDoubleEntryTransactions(
      this.transaction.paymentProvider.OwnerAccountId, this.transaction.paymentProviderWalletId, 
      this.transaction.FromAccountId, this.transaction.FromWalletId,
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
      transactionGroupId: this.transaction.transactionGroupId,
      transactionGroupSequence: this.transaction.transactionGroupSequence,
      transactionGroupTotalAmount: this.transaction.transactionGroupTotalAmount,
      transactionGroupTotalAmountInDestinationCurrency: this.transaction.transactionGroupTotalAmountInDestinationCurrency,
    };
    return this.transactionLib.getDoubleEntryArray(conversionTransaction);
  }
}

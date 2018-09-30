import TransactionLib from '../transactionLib';
import { operationNotAllowed } from '../../globals/errors';

export default class ForexSourceCurencyConversionTransactions {

  constructor(transaction){
    this.transaction = transaction;
    this.transactionLib = new TransactionLib();
  }

  _validateFeeTransaction() {
    if (!this.feeAccountId) {
      throw Error(operationNotAllowed('Fee transaction need to define an AccountId'));
    }
    if (!this.feeWalletId) {
      throw Error(operationNotAllowed('Fee transaction need to define a WalletId'));
    }
    if (!this.fee) {
      throw Error(operationNotAllowed('Fees need to be established before creating a transaction'));
    }
  }

  /** Given a Transaction Returns Its Double Entry Equivalent Array(1 debit and 1 credit Transactions)
  * @param {Object} transaction
  * @return {Array} of transactions
  */
  getFeeDoubleEntryTransactions (){
    this._validateFeeTransaction();
    const conversionTransaction = {
      FromAccountId: this.transaction.FromAccountId,
      FromWalletId: this.transaction.FromWalletId,
      ToAccountId: this.transaction.ToAccountId,
      ToWalletId: this.transaction.ToWalletId,
      amount: this.transaction.amount,
      currency: this.transaction.currency,
      transactionGroupId: this.transaction.transactionGroupId,
      transactionGroupSequence: this.transaction.transactionGroupSequence,
      transactionGroupTotalAmount: this.transaction.transactionGroupTotalAmount,
      transactionGroupTotalAmountInDestinationCurrency: this.transaction.transactionGroupTotalAmountInDestinationCurrency,
    };
    return this.transactionLib.getDoubleEntryArray(conversionTransaction);
  }

}

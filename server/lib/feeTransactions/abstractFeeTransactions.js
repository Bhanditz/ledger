import TransactionLib from '../transactionLib';
import { operationNotAllowed } from '../../globals/errors';

export default class AbstractFeeTransactions {

  constructor(transaction){
    this.transaction = transaction;
    this.fee = null;
    this.transactionLib = new TransactionLib();
  }

  _validateFeeTransaction() {
    if (!this.feeAccountId) {
      throw Error(operationNotAllowed('Fee transaction need to defined an AccountId'));
    }
    if (!this.feeWalletId) {
      throw Error(operationNotAllowed('Fee transaction need to defined a WalletId'));
    }
    if (!this.fee) {
      throw Error(operationNotAllowed('Fees need to be established before creating a transaction'));
    }
  }

  setTransactionInfo() { }

  /** Given a Transaction Returns Its Double Entry Equivalent Array(1 debit and 1 credit Transactions)
  * @param {Object} transaction
  * @return {Array} of transactions
  */
  getFeeDoubleEntryTransactions (){
    this._validateFeeTransaction();
    const feeTransaction = {
      FromAccountId: this.transaction.FromAccountId,
      ToAccountId: this.feeAccountId,
      FromWalletId: this.transaction.FromWalletId,
      ToWalletId: this.feeWalletId,
      amount: Math.round(this.fee),
      currency: this.transaction.currency,
      transactionGroupId: this.transaction.transactionGroupId,
      transactionGroupSequence: this.transaction.transactionGroupSequence,
    };
    return this.transactionLib.getDoubleEntryArray(feeTransaction);
  }

}

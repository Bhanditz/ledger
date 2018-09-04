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
      throw Error(operationNotAllowed('Fee transaction need to define an AccountId'));
    }
    if (!this.feeWalletId) {
      throw Error(operationNotAllowed('Fee transaction need to define a WalletId'));
    }
    if (!this.fee) {
      throw Error(operationNotAllowed('Fees need to be established before creating a transaction'));
    }
  }

  setTransactionInfo() { }

  getTotalFee() {
    return Math.round(this.fee);
  }

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
      amount: this.getTotalFee(),
      currency: this.transaction.currency,
      transactionGroupId: this.transaction.transactionGroupId,
      transactionGroupSequence: this.transaction.transactionGroupSequence,
      transactionGroupTotalAmount: this.transaction.transactionGroupTotalAmount,
    };
    return this.transactionLib.getDoubleEntryArray(feeTransaction);
  }

}

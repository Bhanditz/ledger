import TransactionLib from '../../lib/transactionLib';
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
    // If sender pays the fees, we check whether it's a forex transaction or not
    // to determine the correct wallet. Otherwhise ToWallet will pay the fees by default
    let fromWalletId = this.transaction.ToWalletId;
    let fromAccountId = this.transaction.ToAccountId;
    if (this.transaction.senderPayFees) {
      fromAccountId = this.transaction.FromAccountId;
      fromWalletId = this.transaction.fromWalletDestinationCurrency ?
      this.transaction.fromWalletDestinationCurrency.id :
      this.transaction.FromWalletId;
    }
    const currency = this.transaction.destinationCurrency || this.transaction.currency;
    const feeTransaction = {
      FromAccountId: fromAccountId,
      FromWalletId: fromWalletId,
      ToAccountId: this.feeAccountId,
      ToWalletId: this.feeWalletId,
      amount: this.getTotalFee(),
      currency: currency,
      category: this.category,
      transactionGroupId: this.transaction.transactionGroupId,
      transactionGroupTotalAmount: this.transaction.transactionGroupTotalAmount,
      LegacyTransactionId: this.transaction.LegacyTransactionId,
    };
    return this.transactionLib.getDoubleEntryArray(feeTransaction);
  }

}

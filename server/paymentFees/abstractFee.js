import TransactionLib from '../lib/transactionLib';

export default class AbstractFee {

  constructor(transaction, fixedFee, percentFee, feeAccountId, feeWalletId){
    this.transaction = transaction;
    this.fixedFee = fixedFee ? fixedFee : 0;
    this.percentFee = percentFee ? percentFee : 0;
    this.totalFee = fixedFee + (percentFee * transaction.amount);
    this.feeAccountId = feeAccountId;
    this.feeWalletId = feeWalletId;
    this.util = new TransactionLib();
  }

  /** Given a Transaction Returns Its Double Entry Equivalent Array(1 debit and 1 credit Transactions)
  * @param {Object} transaction
  * @return {Array} of transactions
  */
  getFeeDoubleEntryTransactions (){
    const feeTransaction = {
      FromAccountId: this.transaction.FromAccountId,
      ToAccountId: this.feeAccountId,
      FromWalletId: this.transaction.FromWalletId,
      ToWalletId: this.feeWalletId,
      amount: this.totalFee,
    };
    return this.util.getDoubleEntryArray(feeTransaction);
  }

}

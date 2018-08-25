import uuidv4 from 'uuid/v4';

export default class AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    this.incomingTransaction = this._checkAndInsertTransactionGroup(incomingTransaction);
  }

  /** Return database formatted transaction extracted through this.incomingTransaction
  **  if it doesn't have, insert them
  * @return {Array} of transactions
  */
  async getTransactions (){
  }

  /** Given a transaction, check whether it has a TransactionGroup and a transactionGroupSequence
  **  if it doesn't have, insert them
  * @param {Object} incomingTransaction - transaction
  * @return {Object} same transaction with TransactionGroup and transactionGroupSequence
  */
  _checkAndInsertTransactionGroup(transaction) {
    if (!transaction.transactionGroupId) {
      transaction.transactionGroupId = uuidv4();
      transaction.transactionGroupSequence = 0;
    }
    return transaction;
  }

}

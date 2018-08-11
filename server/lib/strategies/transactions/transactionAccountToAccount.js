import AbstractTransactionStrategy from './abstractTransactionStrategy';

export default class TransactionAccountToAccount extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  getTransactions (){
  }

}

import AbstractTransactionStrategy from './abstractTransactionStrategy';

export default class TransactionCashout extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  getTransactions (){
  }

}

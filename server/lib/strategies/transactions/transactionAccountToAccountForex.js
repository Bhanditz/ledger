import AbstractTransactionStrategy from './abstractTransactionStrategy';

export default class TransactionAccountToAccountForex extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  getTransactions (){
  }

}

import AbstractTransactionStrategy from './abstractTransactionStrategy';

export default class TransactionAccountToAccountFx extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  getTransactions (){
  }

}

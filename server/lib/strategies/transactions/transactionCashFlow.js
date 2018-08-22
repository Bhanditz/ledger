import AbstractTransactionStrategy from './abstractTransactionStrategy';
import TransactionUtil from '../../transactionUtil';
import AccountUtil from '../../accountUtil';

export default class TransactionCashFlow extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this.accountUtil = new AccountUtil();
    this.transactionUtil = new TransactionUtil();
  }

  async getTransactions() {
    return this.transactionUtil.getDoubleEntryArray(this.incomingTransaction);
  }

}

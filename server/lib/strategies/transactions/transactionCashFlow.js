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
    // setting toAccountId to Null(as both from and To are the same, we need only one to set the other to null)
    const cashFlowTransaction = this.incomingTransaction;
    // If there is NO FromWalletId defined it defaults to Cashin Wallet
    if (!this.incomingTransaction.FromWalletId) {
      this.incomingTransaction.FromWalletId = await this.accountUtil.getDefaultCashinWalletId(this.incomingTransaction.FromAccountId);
    }
    // If there is NO ToWalletId defined it defaults to Cashout Wallet
    if (!this.incomingTransaction.ToWalletId) {
      this.incomingTransaction.ToWalletId = await this.accountUtil.getDefaultCashoutWalletId(this.incomingTransaction.FromAccountId);
    }
    return this.transactionUtil.getDoubleEntryArray(cashFlowTransaction);
  }

}

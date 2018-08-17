import AbstractTransactionStrategy from './abstractTransactionStrategy';
import WalletUtil from '../../walletUtil';
import TransactionUtil from '../../transactionUtil';
import TransactionCashFlow from './transactionCashFlow';

export default class TransactionAccountToAccount extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    const transactionUtil = new TransactionUtil();
    transactionUtil.validateTransaction(incomingTransaction);
    super(incomingTransaction);
    this.walletUtil = new WalletUtil();
    this.transactionUtil = transactionUtil;
  }

  async getTransactions (){
    let transactions = [];
    const fromWalletBalance = await this.walletUtil.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If there is no money in Account Wallet, then it needs to Cash In
    if ( fromWalletBalance < this.incomingTransaction.amount) {
      const cashInTransaction = {
        FromAccountId: this.incomingTransaction.FromAccountId,
        ToAccountId: this.incomingTransaction.FromAccountId,
        FromWalletId: null, // Setting up as null will make it look for the default Cash In Wallet
        ToWalletId: this.incomingTransaction.FromWalletId,
        amount: this.incomingTransaction.amount - fromWalletBalance, // topup the remaning amount to complete tx
        currency: this.incomingTransaction.currency,
        transactionGroupId: this.incomingTransaction.transactionGroupId,
        transactionGroupSequence: this.incomingTransaction.transactionGroupSequence,
      };
      const transactionCashFlow = new TransactionCashFlow(cashInTransaction);
      const cashInTransactions = await transactionCashFlow.getTransactions();
      transactions = transactions.concat(cashInTransactions);
      // after updating the transactions array, we need to get the last
      // transactionGroupSequence and iterate so we would know the next
      // transaction from the sequence
      this.incomingTransaction.transactionGroupSequence =
        transactions[transactions.length-1].transactionGroupSequence + 1;
    }
    const account2AccountTransactions = this.transactionUtil.getDoubleEntryArray(this.incomingTransaction);
    transactions = transactions.concat(account2AccountTransactions);
    return transactions;
  }

}

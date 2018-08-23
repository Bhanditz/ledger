import AbstractTransactionStrategy from './abstractTransactionStrategy';
import WalletUtil from '../../walletUtil';
import TransactionUtil from '../../transactionUtil';
import TransactionCashFlow from './transactionCashFlow';
import { operationNotAllowed } from '../../../globals/errors';

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
    // Do not allowing creating transactions If there is no money in Account Wallet
    if ( fromWalletBalance < this.incomingTransaction.amount) {
      throw Error(operationNotAllowed(`Wallet(id ${this.incomingTransaction.FromWalletId}) does not have enough balance to complete transaction`));
    }
    const account2AccountTransactions = this.transactionUtil.getDoubleEntryArray(this.incomingTransaction);
    transactions = transactions.concat(account2AccountTransactions);
    return transactions;
  }

}

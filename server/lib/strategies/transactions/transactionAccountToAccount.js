import AbstractTransactionStrategy from './abstractTransactionStrategy';
import WalletLib from '../../walletLib';
import TransactionLib from '../../transactionLib';
import { operationNotAllowed } from '../../../globals/errors';

export default class TransactionAccountToAccount extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    const transactionLib = new TransactionLib();
    transactionLib.validateTransaction(incomingTransaction);
    super(incomingTransaction);
    this.walletLib = new WalletLib();
    this.transactionLib = transactionLib;
  }

  async getTransactions (){
    let transactions = [];
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // Do not allowing creating transactions If there is no money in Account Wallet
    if ( fromWalletBalance < this.incomingTransaction.amount) {
      throw Error(operationNotAllowed(`Wallet(id ${this.incomingTransaction.FromWalletId}) does not have enough balance to complete transaction`));
    }
    const account2AccountTransactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    transactions = transactions.concat(account2AccountTransactions);
    return transactions;
  }

}

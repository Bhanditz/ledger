import AbstractTransactionStrategy from './abstractTransactionStrategy';
import TransactionLib from '../../transactionLib';
import WalletLib from '../../walletLib';
import { operationNotAllowed } from '../../../globals/errors';
import Wallet from '../../../models/Wallet';
import { paymentMethodServices } from '../../../globals/enums/paymentMethodServices';

export default class TransactionCashFlowForex extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this.transactionLib = new TransactionLib();
    this.walletLib = new WalletLib();
  }

  async getTransactions() {
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If there is no money in Account Wallet, then it needs to Cash In
    if ( fromWalletBalance < this.incomingTransaction.amount &&
         fromWallet.type != paymentMethodServices.stripe.types.CREDITCARD) {
      throw Error(operationNotAllowed(`Wallet(id ${this.incomingTransaction.FromWalletId}) does not have enough balance to complete transaction`));
    }
    return this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
  }

}

import AbstractTransactionStrategy from './abstractTransactionStrategy';
import TransactionUtil from '../../transactionUtil';
import WalletUtil from '../../walletUtil';
import { operationNotAllowed } from '../../../globals/errors';
import Wallet from '../../../models/Wallet';
import { paymentMethodServices } from '../../../globals/enums/paymentMethodServices';

export default class TransactionCashFlow extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this.transactionUtil = new TransactionUtil();
    this.walletUtil = new WalletUtil();
  }

  async getTransactions() {
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    const fromWalletBalance = await this.walletUtil.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If there is no money in Account Wallet, then it needs to Cash In
    if ( fromWalletBalance < this.incomingTransaction.amount &&
         fromWallet.paymentMethodType != paymentMethodServices.stripe.types.CREDITCARD) {
      throw Error(operationNotAllowed(`Wallet(id ${this.incomingTransaction.FromWalletId}) does not have enough balance to complete transaction`));
    }
    return this.transactionUtil.getDoubleEntryArray(this.incomingTransaction);
  }

}

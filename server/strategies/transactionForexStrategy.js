import TransactionLib from '../lib/transactionLib';
import WalletLib from '../lib/walletLib';
import { operationNotAllowed } from '../globals/errors';
import Wallet from '../models/Wallet';
import { paymentMethodServices } from '../globals/enums/paymentMethodServices';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';

export default class TransactionForexStrategy extends AbstractTransactionForexStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this.transactionLib = new TransactionLib();
    this.walletLib = new WalletLib();
  }

  async convertCurrencyTransactions(fromWallet) {
    const temporaryDestinationCurrencyWallet = await Wallet.findOrCreate({
      temporary: true,
      currency: this.incomingTransaction.destinationCurrency,
      OwnerAccountId: fromWallet.OwnerAccountId,
      name: `temp_${this.incomingTransaction.destinationCurrency}_${fromWallet.OwnerAccountId}`,
    });
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

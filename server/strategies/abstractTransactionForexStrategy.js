import { pickBy, identity } from 'lodash';
import AbstractTransactionStrategy from './abstractTransactionStrategy';
import { operationNotAllowed } from '../globals/errors';

export default class AbstractTransactionForexStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this._validateForexTransaction();
  }

  async findOrCreateWallets(fromWalletConvertCurrency) {
    // check whether there is a payment provider
    if (this.incomingTransaction.paymentProviderWallet) {
      this.incomingTransaction.paymentProviderWallet = await this.walletLib
        .findOrCreateCurrencyWallet(pickBy(this.incomingTransaction.paymentProviderWallet, identity));
        this.incomingTransaction.PaymentProviderAccountId =
          this.incomingTransaction.paymentProviderWallet.PaymentProviderAccountId;
    }
    // finding or creating from and to Wallets
    this.incomingTransaction.fromWallet = await this.walletLib
      .findOrCreateCurrencyWallet(this.incomingTransaction.fromWallet);
    this.incomingTransaction.toWallet = await this.walletLib
      .findOrCreateCurrencyWallet(this.incomingTransaction.toWallet);
    this.incomingTransaction.FromWalletId = this.incomingTransaction.fromWallet.id;
    this.incomingTransaction.ToWalletId = this.incomingTransaction.toWallet.id;
    if (!fromWalletConvertCurrency) {
      this.incomingTransaction.toWalletSourceCurrency = await this.walletLib.findOrCreateTemporaryCurrencyWallet(
        this.incomingTransaction.currency,
        this.incomingTransaction.toWallet.AccountId,
        this.incomingTransaction.toWallet.OwnerAccountId
      );
      return;
    }
    this.incomingTransaction.fromWalletDestinationCurrency = await this.walletLib.findOrCreateTemporaryCurrencyWallet(
      this.incomingTransaction.destinationCurrency,
      this.incomingTransaction.fromWallet.AccountId,
      this.incomingTransaction.fromWallet.OwnerAccountId
    );
  }

  getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction) {
    let netTransactionAmount = this.incomingTransaction.destinationAmount;
    if (paymentProviderFeeTransactions) {
      netTransactionAmount -= paymentProviderFeeTransactions.getTotalFee();
    }
    if (platformFeeTransaction) {
      netTransactionAmount -= platformFeeTransaction.getTotalFee();
    }
    if (providerFeeTransaction) {
      netTransactionAmount -= providerFeeTransaction.getTotalFee();
    }
    return netTransactionAmount;
  }

  _validateForexTransaction() {
    if (!this.incomingTransaction.destinationAmount) {
      throw Error(operationNotAllowed('field destinationAmount missing'));
    }
    if (!this.incomingTransaction.destinationCurrency) {
      throw Error(operationNotAllowed('field destinationCurrency missing'));
    }
    if (!this.incomingTransaction.paymentProviderWallet) {
      throw Error(operationNotAllowed('field paymentProviderWallet missing'));
    }
  }

}

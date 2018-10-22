import AbstractTransactionStrategy from './abstractTransactionStrategy';
import { operationNotAllowed } from '../globals/errors';

export default class AbstractTransactionForexStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this._validateForexTransaction();
  }

  async findOrCreateAccountWallets() {
    // finding or creating from and to Wallets
    this.incomingTransaction.fromWallet = await this.walletLib.findOrCreateCurrencyWallet(
      this.incomingTransaction.fromWallet.name,
      this.incomingTransaction.fromWallet.currency,
      this.incomingTransaction.fromWallet.AccountId,
      this.incomingTransaction.fromWallet.OwnerAccountId,
    );
    this.incomingTransaction.toWallet = await this.walletLib.findOrCreateCurrencyWallet(
      this.incomingTransaction.toWallet.name,
      this.incomingTransaction.toWallet.currency,
      this.incomingTransaction.toWallet.AccountId,
      this.incomingTransaction.toWallet.OwnerAccountId,
    );
    this.incomingTransaction.FromWalletId = this.incomingTransaction.fromWallet.id;
    this.incomingTransaction.ToWalletId = this.incomingTransaction.toWallet.id;
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
      throw Error(operationNotAllowed('paymentProviderWallet field missing'));
    }
    if (!this.incomingTransaction.PaymentProviderAccountId) {
      throw Error(operationNotAllowed('PaymentProviderAccountId field missing'));
    }
  }

}

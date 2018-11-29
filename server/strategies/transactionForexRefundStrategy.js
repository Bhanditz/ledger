import Promise from 'bluebird';
import { pickBy, identity } from 'lodash';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import ForexToAccountConvertTransactions from '../lib/forexToAccountConvertTransactions';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import TransactionForexStrategy from './transactionForexStrategy';
import LedgerTransaction from '../models/LedgerTransaction';

export default class TransactionForexRefundStrategy  extends AbstractTransactionForexStrategy {
  constructor(transaction) {
    super(transaction);
  }

  async _generateRefundWallets() {
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
    this.incomingTransaction.toWalletSourceCurrency = await this.walletLib.findOrCreateTemporaryCurrencyWallet(
      this.incomingTransaction.currency,
      this.incomingTransaction.toWallet.AccountId,
      this.incomingTransaction.toWallet.OwnerAccountId
    );
    this.incomingTransaction.fromWalletDestinationCurrency = await this.walletLib.findOrCreateTemporaryCurrencyWallet(
      this.incomingTransaction.destinationCurrency,
      this.incomingTransaction.fromWallet.AccountId,
      this.incomingTransaction.fromWallet.OwnerAccountId
    );
  }

  async getTransactions() {
    await this._generateRefundWallets();
    // generating fee transactions
    const feeStrategy = new TransactionForexStrategy({
      ...this.incomingTransaction,
      FromAccountId: this.incomingTransaction.ToAccountId,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromWalletId: this.incomingTransaction.ToWalletId,
      ToWalletId: this.incomingTransaction.fromWalletDestinationCurrency.id,
      fromWallet: this.incomingTransaction.toWallet,
      toWallet: this.incomingTransaction.fromWalletDestinationCurrency,
    });
    const [paymentProviderFeeManager, platformFeeManager, providerFeeManager] = await feeStrategy.getFeeTransactions();
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = [
      paymentProviderFeeManager ? paymentProviderFeeManager.getFeeDoubleEntryTransactions() : [],
      platformFeeManager ? platformFeeManager.getFeeDoubleEntryTransactions() : [],
      providerFeeManager ? providerFeeManager.getFeeDoubleEntryTransactions() : [],
    ];
    // generating conversion(SENDER) transactions
    const refundSenderConversionTransaction = {
      ...this.incomingTransaction,
      amount: this.incomingTransaction.destinationAmount,
      currency: this.incomingTransaction.destinationCurrency,
      destinationAmount: this.incomingTransaction.amount,
      destinationCurrency: this.incomingTransaction.currency,
      toWalletSourceCurrency: { id: this.incomingTransaction.fromWalletDestinationCurrency.id },
      ToWalletId: this.incomingTransaction.fromWallet.id,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromAccountId: this.incomingTransaction.ToAccountId,
    };
    const conversionTransactionsManager = new ForexToAccountConvertTransactions(refundSenderConversionTransaction);
    const conversionSenderTransactions = conversionTransactionsManager.getForexDoubleEntryTransactions();
    // generating account to account transactions
    const accountToAccountlDestinationCurrencyTransactions = this.transactionLib
      .getDoubleEntryArray({
        ...this.incomingTransaction,
        ToWalletId: this.incomingTransaction.toWalletSourceCurrency.id,
        toWallet: this.incomingTransaction.toWalletSourceCurrency,
      })
      .map(transaction => {
        transaction.category = transactionCategoryEnum.ACCOUNT;
        return transaction;
      });
    // generating conversion(RECEIVER) transactions
    const conversionReceiverTransactionsManager = new ForexToAccountConvertTransactions(this.incomingTransaction);
    const conversionReceiverTransactions = conversionReceiverTransactionsManager.getForexDoubleEntryTransactions();
    // finding "original" transactions to be refunded by current transaction
    // and order them by fees, conversion(sender), account to account and conversion(receiver) respectively.
    const ledgerTransactions = Promise.map([
      ...paymentProviderFeeTransactions,
      ...platformFeeTransactions,
      ...providerFeeTransactions,
      ...conversionSenderTransactions,
      ...accountToAccountlDestinationCurrencyTransactions,
      ...conversionReceiverTransactions,
    ], async ledgerTransaction => {
      // when a refund is made, the RefundTransactionId of a CREDIT transaction
      // corresponds to the id of the original correlated DEBIT transaction
      const refundTransaction = await LedgerTransaction.findOne({
        attributes: ['id', 'amount'],
        where: {
          LegacyDebitTransactionId: this.incomingTransaction.RefundTransactionId,
          type: ledgerTransaction.type,
          category: ledgerTransaction.category,
        },
      });
      if (!refundTransaction) return ledgerTransaction;
      // the contributor will always be fully reimbursed as the host pays any fee loss
      // IF THERE IS A CONVERSION THIS MAY NOT BE TRUE FOR ALL CASES(SEE opencollective-api Transactions table ids 99446 and 83642)
      // if (ledgerTransaction.category === transactionCategoryEnum.ACCOUNT) {
      //   ledgerTransaction.amount = refundTransaction.amount;
      // }
      ledgerTransaction.RefundTransactionId = refundTransaction.id;
      ledgerTransaction.category = `REFUND: ${ledgerTransaction.category}`;
      return ledgerTransaction;
    });
    return ledgerTransactions;
  }

}

import Promise from 'bluebird';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import ForexToAccountConvertTransactions from '../lib/forexToAccountConvertTransactions';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import TransactionForexStrategy from './transactionForexStrategy';
import LedgerTransaction from '../models/LedgerTransaction';
import Wallet from '../models/Wallet';

export default class TransactionForexRefundStrategy  extends AbstractTransactionForexStrategy {
  constructor(transaction) {
    super(transaction);
  }

  async _generateRefundWallets() {
    // tries to find existing wallet(its very likely it exists due the fact it is a refund)
    this.incomingTransaction.fromWalletDestinationCurrency = await Wallet.findOne({
      where: {
        currency: this.incomingTransaction.destinationCurrency,
        AccountId: `${this.incomingTransaction.fromWallet.AccountId}`,
        OwnerAccountId: `${this.incomingTransaction.fromWallet.OwnerAccountId}`,
      },
    });
    await this.findOrCreateWallets(false);
    this.incomingTransaction.toWalletSourceCurrency = await this.walletLib.findOrCreateTemporaryCurrencyWallet(
      this.incomingTransaction.currency,
      this.incomingTransaction.toWallet.AccountId,
      this.incomingTransaction.toWallet.OwnerAccountId
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

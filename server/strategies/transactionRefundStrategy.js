import LedgerTransaction from '../models/LedgerTransaction';
import AbstractTransactionStrategy from './abstractTransactionStrategy';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import Promise from 'bluebird';
import TransactionRegularStrategy from './transactionRegularStrategy';

export default class TransactionRefundStrategy extends AbstractTransactionStrategy {
  constructor(transaction) {
    super(transaction);
  }

  async getTransactions() {
    await this.findOrCreateWallets();
    const feeStrategy = new TransactionRegularStrategy({
      ...this.incomingTransaction,
      FromAccountId: this.incomingTransaction.ToAccountId,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromWalletId: this.incomingTransaction.ToWalletId,
      ToWalletId: this.incomingTransaction.FromWalletId,
      fromWallet: this.incomingTransaction.toWallet,
      toWallet: this.incomingTransaction.fromWallet,
    });
    const [paymentProviderFeeManager, platformFeeManager, providerFeeManager] = await feeStrategy.getFeeTransactions();
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = [
      paymentProviderFeeManager ? paymentProviderFeeManager.getFeeDoubleEntryTransactions() : [],
      platformFeeManager ? platformFeeManager.getFeeDoubleEntryTransactions() : [],
      providerFeeManager ? providerFeeManager.getFeeDoubleEntryTransactions() : [],
    ];
    const accountStrategy = new TransactionRegularStrategy(this.incomingTransaction);
    const transactions = await accountStrategy.getFormattedTransactions();
    // finding "original" transactions to be refunded by current transaction
    // and order them by fees first
    const ledgerTransactions = Promise.map([
      ...paymentProviderFeeTransactions,
      ...platformFeeTransactions,
      ...providerFeeTransactions,
      ...transactions.filter(t => t.category === transactionCategoryEnum.ACCOUNT),
    ], async ledgerTransaction => {
      // when a refund is made, the RefundTransactionId of a CREDIT transaction
      // corresponds to the id of the original correlated DEBIT transaction
      const refundTransaction = await LedgerTransaction.findOne({
        attributes: ['id', 'amount'],
        where: {
          LegacyDebitTransactionId: this.incomingTransaction
            .RefundTransactionId,
          type: ledgerTransaction.type,
          category: ledgerTransaction.category,
        },
      });
      // the contributor will always be fully reimbursed as the host pays any fee loss
      if (ledgerTransaction.category === transactionCategoryEnum.ACCOUNT) {
        ledgerTransaction.amount = refundTransaction.amount;
      }
      ledgerTransaction.RefundTransactionId = refundTransaction.id;
      ledgerTransaction.category = `REFUND: ${ledgerTransaction.category}`;
      return ledgerTransaction;
    });
    return ledgerTransactions;
  }

}

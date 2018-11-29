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

      let refundTransaction;
      // Either it has a refundTransactionGroupId(UUID) or it has a RefundTransactionId ( id referringLegacy)
      if (this.incomingTransaction.refundTransactionGroupId) {
        refundTransaction = await LedgerTransaction.findOne({
          attributes: ['transactionGroupId'],
          where: {
            transactionGroupId: this.incomingTransaction.refundTransactionGroupId,
          },
        });
      } else if (this.incomingTransaction.RefundTransactionId) {
        refundTransaction = await LedgerTransaction.findOne({
          attributes: ['transactionGroupId'],
          where: {
            LegacyDebitTransactionId: this.incomingTransaction.RefundTransactionId,
            type: ledgerTransaction.type,
            category: ledgerTransaction.category,
          },
        });
      }
      // the contributor will always be fully reimbursed as the host pays any fee loss
      if (ledgerTransaction.category === transactionCategoryEnum.ACCOUNT) {
        ledgerTransaction.amount = refundTransaction.amount;
      }
      if (!refundTransaction) return ledgerTransaction;

      ledgerTransaction.refundTransactionGroupId = refundTransaction.transactionGroupId;
      ledgerTransaction.category = `REFUND: ${ledgerTransaction.category}`;
      return ledgerTransaction;


    });
    return ledgerTransactions;
  }

}

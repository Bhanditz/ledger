import LedgerTransaction from '../models/LedgerTransaction';
import AbstractTransactionStrategy from './abstractTransactionStrategy';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import Promise from 'bluebird';

export default class TransactionRefundStrategy  extends AbstractTransactionStrategy {
  constructor(transaction) {
    super(transaction);
  }

  async getTransactions() {
    await this.findOrCreateWallets();
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    let netTransactionAmount = Math.abs(this.incomingTransaction.amount);
    if (paymentProviderFeeTransactions) {
      netTransactionAmount += Math.abs(paymentProviderFeeTransactions.getTotalFee());
    }
    if (platformFeeTransactions) {
      netTransactionAmount += Math.abs(platformFeeTransactions.getTotalFee());
    }
    if (providerFeeTransactions) {
      netTransactionAmount += Math.abs(providerFeeTransactions.getTotalFee());
    }
    const totalAmountTransaction = {
      ...this.incomingTransaction,
      amount: netTransactionAmount,
      FromAccountId: this.incomingTransaction.ToAccountId,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromWalletId: this.incomingTransaction.ToWalletId,
      ToWalletId: this.incomingTransaction.FromWalletId,
      fromWallet: this.incomingTransaction.toWallet,
      toWallet: this.incomingTransaction.fromWallet,
    };
    // create account to account transactions after having a net amount(total amount - fees)
    const accountToAccountTransactions = this.transactionLib.getDoubleEntryArray(totalAmountTransaction)
    .map(transaction => {
      transaction.category = transactionCategoryEnum.ACCOUNT;
      return transaction;
    });
    let transactions = [];
    if (paymentProviderFeeTransactions) {
      // Add Payment Provider Fee transactions to transactions array
      transactions = transactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());
    }
    if (platformFeeTransactions) {
      // Add Platform Fee transactions to transactions array
      transactions = transactions.concat(platformFeeTransactions.getFeeDoubleEntryTransactions());
    }
    if (providerFeeTransactions) {
      // Add Wallet Provider Fee transactions to transactions array
      transactions = transactions.concat(providerFeeTransactions.getFeeDoubleEntryTransactions());
    }
    transactions = Promise.map(transactions.concat(accountToAccountTransactions), async (ledgerTransaction) => {
      // when a refund is made, the RefundTransactionId of a CREDIT transaction
      // corresponds to the id of the original correlated DEBIT transaction
      const refundTransaction = await LedgerTransaction.findOne({
        attributes: ['id'],
        where: {
          LegacyDebitTransactionId: this.incomingTransaction.RefundTransactionId,
          type: ledgerTransaction.type,
          category: ledgerTransaction.category,
        },
      });
      ledgerTransaction.RefundTransactionId = refundTransaction.id;
      ledgerTransaction.category = `REFUND: ${ledgerTransaction.category}`;
      return ledgerTransaction;
    });
    return transactions;
  }
}

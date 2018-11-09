import LedgerTransaction from '../models/LedgerTransaction';

export default class TransactionRefundStrategy {
  constructor(transaction, auxStrategy) {
    this.transaction = transaction;
    this.auxStrategy = auxStrategy;
  }

  async getTransactions() {
    const transactions = await this.auxStrategy.getTransactions()
    .map( async (ledgerTransaction) => {
      // when a refund is made, the RefundTransactionId of a CREDIT transaction
      // corresponds to the id of the original correlated DEBIT transaction
      const refundTransaction = await LedgerTransaction.findOne({
        attributes: ['id'],
        where: {
          LegacyDebitTransactionId: this.transaction.RefundTransactionId,
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

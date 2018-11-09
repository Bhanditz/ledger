import TransactionService from '../services/transactionService';
import transactionTypeEnum from '../globals/enums/transactionTypeEnum';
import LedgerTransaction from '../models/LedgerTransaction';

export default class TransactionRefundStrategy {

    constructor(refundTransactionId) {
    this.refundTransactionId = refundTransactionId;
    this.service = new TransactionService();
  }

  async getTransactions() { // getTransactionsWithToAccountConvertingCurrency
    // Problem because credit transactions point to debit transactions on refund
    // and we only look for credit transactions
    const legacyRefundTransaction = LedgerTransaction.findOne({
        where: {
            LegacyTransactionId: this.refundTransactionId,
        },
    });
    if (!legacyRefundTransaction) {
        throw Error('Refund transaction did not match any previous transaction');
    }
    const transactions = await LedgerTransaction.findAll(legacyRefundTransaction.transactionGroupId);
    if (!transactions || transactions.length <= 0) {
        throw Error('Refund transaction did not match any previous transaction');
    }
    const refundTransactions =  transactions.map( transaction => {
        const type = transaction.type === transactionTypeEnum.DEBIT ?
            transactionTypeEnum.CREDIT :
            transactionTypeEnum.DEBIT;
        return {
              type: type,
              FromAccountId: transaction.ToAccountId,
              FromWalletId: transaction.ToWalletId,
              ToAccountId: transaction.FromAccountId,
              ToWalletId: transaction.FromWalletId,
              amount: transaction.amount * -1,
              currency: transaction.currency,
              transactionGroupId: transaction.transactionGroupId,
              doubleEntryGroupId: transaction.doubleEntryGroupId,
              category: `REFUND: ${transaction.category}`,
              forexRate: transaction.forexRate,
              forexRateSourceCoin: transaction.forexRateSourceCoin,
              forexRateDestinationCoin: transaction.forexRateDestinationCoin,
              LegacyTransactionId: this.refundTransactionId,
              RefundTransactionId: transaction.id,
        };
    });
    return refundTransactions;
  }

}

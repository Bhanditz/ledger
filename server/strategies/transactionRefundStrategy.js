import TransactionService from '../services/transactionService';
import transactionTypeEnum from '../globals/enums/transactionTypeEnum';

export default class TransactionRefundStrategy {

    constructor(refundTransactionId) {
    this.refundTransactionId = refundTransactionId;
    this.service = new TransactionService();
  }

  async getTransactions() { // getTransactionsWithToAccountConvertingCurrency
    const transactions = await this.service.getOne(this.refundTransactionId);
    if (!transactions || transactions.length <= 0) {
        throw Error('Refund transaction did not match any previous transaction');
    }
    return transactions.map( transaction => {
        return {
              type: transaction.type === transactionTypeEnum.DEBIT ? transactionTypeEnum.CREDIT : transactionTypeEnum.DEBIT,
              FromAccountId: transaction.ToAccountId,
              FromWalletId: transaction.ToWalletId,
              ToAccountId: transaction.FromAccountId,
              ToWalletId: transaction.FromWalletId,
              amount: transaction.amount * -1,
              currency: transaction.currency,
              transactionGroupId: transaction.transactionGroupId,
              doubleEntryGroupId: transaction.doubleEntryGroupId,
              category: transaction.category,
              forexRate: transaction.forexRate,
              forexRateSourceCoin: transaction.forexRateSourceCoin,
              forexRateDestinationCoin: transaction.forexRateDestinationCoin,
              LegacyTransactionId: this.refundTransactionId,
              RefundTransactionId: transaction.id,
        };
    });
  }

}

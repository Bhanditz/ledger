import AbstractTransactionStrategy from './abstractTransactionStrategy';
import { transactionTypeEnum } from '../../../globals/enums/transactionTypeEnum';

export default class TransactionCashin extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  getTransactions() {
    const debitTransaction = {
      type: transactionTypeEnum.DEBIT,
      FromAccountId: this.incomingTransaction.FromAccountId,
      ToAccountId: null,
      FromWalletId: this.incomingTransaction.ToWalletId,
      ToWalletId: this.incomingTransaction.FromWalletId,
      amount: (-1 * this.incomingTransaction.amount),
      currency: this.incomingTransaction.currency,
      TransactionGroup: this.incomingTransaction.TransactionGroup,
      transactionGroupSequence: this.incomingTransaction.transactionGroupSequence,
    };
    const creditTransaction = {
      type: transactionTypeEnum.CREDIT,
      FromAccountId: null,
      ToAccountId: this.incomingTransaction.FromAccountId,
      FromWalletId: this.incomingTransaction.FromWalletId,
      ToWalletId: this.incomingTransaction.ToWalletId,
      amount: this.incomingTransaction.amount,
      currency: this.incomingTransaction.currency,
      TransactionGroup: this.incomingTransaction.TransactionGroup,
      transactionGroupSequence: this.incomingTransaction.transactionGroupSequence + 1,
    };

    return [debitTransaction, creditTransaction];
  }

}

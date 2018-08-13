import models, { sequelize } from '../models';
import AbstractCrudService from './abstractCrudService';
import { transactionTypeEnum } from '../globals/enums/transactionTypeEnum';
import TransactionCashin from '../lib/strategies/transactions/transactionCashin';
import TransactionCashout from '../lib/strategies/transactions/transactionCashout';
import TransactionAccountToAccountFx from '../lib/strategies/transactions/transactionAccountToAccountFx';
import TransactionAccountToAccount from '../lib/strategies/transactions/transactionAccountToAccount';
import Logger from '../globals/logger';

export default class TransactionService extends AbstractCrudService {

  constructor() {
    super(models.Transaction);
    this.logger = new Logger();
  }

  create(data) {
    const strategy = this._defineTransactionStrategy(data);
    // the strategy will return an array of transactions already formatted for the db
    const transactions = strategy.getTransactions();
    // Creating a Sequelize "Managed transaction" which automatically commits
    // if all transactions are done or rollback if any of them fail.
    return sequelize.transaction( t => {
        return models.Transaction.bulkCreate(transactions, { transaction: t });
    }).then( result => {
      this.logger.info(result, 'Transactions created successfully');
      return result;
    }).catch( error => {
      this.logger.error('Rolling Back Transactions', error);
      throw error;
    });
  }

  _defineTransactionStrategy(transaction) {
    // Cashin Or Cashout have the same Account(From and To)
    if (transaction.FromAccountId === transaction.ToAccountId) {
      if (transaction.amount > 0) {
        return new TransactionCashin(transaction);
      }
      return new TransactionCashout(transaction);
    }
    // If both toAmount and toCurrency are defined, it means it's an FX Transaction
    if (transaction.toAmount && transaction.toCurrency) {
      return new TransactionAccountToAccountFx(transaction);
    }
    return new TransactionAccountToAccount(transaction);
  }

  /** Given a transaction, return the same transaction plus its
  **  double entry equivalent transaction
  * @param {Object} incomingTransaction - transaction
  * @return {Array} containing the original incoming transaction + its double entry equivalent.
  */
  generateDoubleEntryTransactions(incomingTransaction) {
    const doubleEntryTransactionType = (incomingTransaction.type === transactionTypeEnum.DEBIT)
      ? transactionTypeEnum.CREDIT
      : transactionTypeEnum.DEBIT;

    return [
      incomingTransaction,
      {
        FromAccountId: incomingTransaction.ToAccountId ? incomingTransaction.ToAccountId : null,
        ToAccountId: incomingTransaction.FromAccountId ? incomingTransaction.FromAccountId : null,
        FromWalletId: incomingTransaction.ToWalletId,
        ToWalletId: incomingTransaction.FromWalletId,
        type: doubleEntryTransactionType,
        TransactionGroup: incomingTransaction.TransactionGroup,
        currency: incomingTransaction.currency,
        amount: (-1 * incomingTransaction.amount),
        transactionGroupSequence: incomingTransaction.transactionGroupSequence + 1,
      },
    ];
  }

  generateCashoutTransaction(incomingTransaction) {
    this._checkAndInsertTransactionGroup(incomingTransaction);
    const cashoutTransactions = this.generateDoubleEntryTransactions(incomingTransaction);
    return cashoutTransactions;
  }

  generateCashinTransaction(incomingTransaction) {
    this._checkAndInsertTransactionGroup(incomingTransaction);
    const cashoutTransactions = this.generateDoubleEntryTransactions(incomingTransaction);
    return cashoutTransactions;
  }

}

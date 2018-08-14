import models, { sequelize } from '../models';
import AbstractCrudService from './abstractCrudService';
import TransactionCashFlow from '../lib/strategies/transactions/transactionCashFlow';
import TransactionAccountToAccountFx from '../lib/strategies/transactions/transactionAccountToAccountFx';
import TransactionAccountToAccount from '../lib/strategies/transactions/transactionAccountToAccount';
import Logger from '../globals/logger';

export default class TransactionService extends AbstractCrudService {

  constructor() {
    super(models.Transaction);
    this.logger = new Logger();
  }

  /** Given a transaction, identify which kind of transaction it will be and
  **  persists the group of transactions it will generate
  * @param {Object} incomingTransaction - transaction
  * @return {Array} containing the original incoming transaction + its double entry equivalent.
  */
  async create(data) {
    // the strategy will return an array of transactions already formatted for the db
    const strategy = this._defineTransactionStrategy(data);
    const transactions = await strategy.getTransactions();

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


  /** Given a transaction, return the related "strategy" Object
  * @param {Object} incomingTransaction - transaction
  * @return {Object} strategy - Return defined Strategy Class Object
  */
  _defineTransactionStrategy(transaction) {
    // Cashin Or Cashout have the same Account(From and To)
    if (transaction.FromAccountId === transaction.ToAccountId) {
      return new TransactionCashFlow(transaction);
    }
    // If both toAmount and toCurrency are defined, it means it's an FX Transaction
    if (transaction.toAmount && transaction.toCurrency) {
      return new TransactionAccountToAccountFx(transaction);
    }
    // Defaults to an Account to Account Transaction
    return new TransactionAccountToAccount(transaction);
  }
}

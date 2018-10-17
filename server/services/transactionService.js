import AbstractCrudService from './abstractCrudService';
import Transaction from '../models/Transaction';
import TransactionRegularStrategy from '../strategies/transactionRegularStrategy';
import TransactionForexStrategy from '../strategies/transactionForexStrategy';
import Logger from '../globals/logger';
import { operationNotAllowed } from '../globals/errors';

export default class TransactionService extends AbstractCrudService {

  constructor() {
    super(Transaction);
    this.logger = new Logger();
  }

  /** Given a transaction, identify which kind of transaction it will be and
  **  persists the group of transactions it will generate
  * @param {Object} incomingTransaction - transaction
  * @return {Array} containing the original incoming transaction + its double entry equivalent.
  */
  async insert(data) {
    // the strategy will return an array of transactions already formatted for the db
    const strategy = await this._defineTransactionStrategy(data);
    const transactions = await strategy.getTransactions();
    // adding transactionGroupSequence to the batch of transactions
    for (const index in transactions) {
    transactions[index].transactionGroupSequence = parseInt(index);
    }
    // Creating a Sequelize "Managed transaction" which automatically commits
    // if all transactions are done or rollback if any of them fail.
    return this.database.sequelize.transaction( t => {
        return this.model.bulkCreate(transactions, { transaction: t });
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
  async _defineTransactionStrategy(transaction) {
    // Check if it is NOT a foreign exchange Transaction
    if (!transaction.destinationCurrency) {
      return new TransactionRegularStrategy(transaction);
    }
    // field PaymentProviderWalletId is required for forex transactions
    if (!transaction.PaymentProviderWalletId) {
      throw Error(operationNotAllowed('field PaymentProviderWalletId missing'));
    }
    return new TransactionForexStrategy(transaction);
  }
}

import AbstractCrudService from './abstractCrudService';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';
import TransactionCashFlow from '../lib/strategies/transactions/transactionCashFlow';
import TransactionCashFlowForex from '../lib/strategies/transactions/transactionCashFlowForex';
import TransactionAccountToAccountForex from '../lib/strategies/transactions/transactionAccountToAccountForex';
import TransactionAccountToAccount from '../lib/strategies/transactions/transactionAccountToAccount';
import Logger from '../globals/logger';

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
    // find Wallets
    const toWallet = await Wallet.findById(transaction.ToWalletId);
    const fromWallet = await Wallet.findById(transaction.FromWalletId);
    // Adding from and to Account ids according to wallets owners
    transaction.ToAccountId = toWallet.OwnerAccountId;
    transaction.FromAccountId = fromWallet.OwnerAccountId;
    const isSameCurrency = toWallet.currency === fromWallet.currency;
    // Cashin Or Cashout have the same Account(From and To)
    if (transaction.FromAccountId === transaction.ToAccountId) {
      // Check if it is NOT a foreign exchange Transaction
      if (isSameCurrency) {
        return new TransactionCashFlow(transaction);
      }
      // TO DO Create FOREX version of TransactionCashFlow
      return new TransactionCashFlowForex(transaction);
    }
    // Defaults to Account to Account transactions...
    // Check if it is NOT a foreign exchange Transaction
    if (isSameCurrency) {
      return new TransactionAccountToAccount(transaction);
    }
    return new TransactionAccountToAccountForex(transaction);
  }
}

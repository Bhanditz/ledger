import Database from '../models';
import Transaction from '../models/Transaction';

export default class WalletUtil {
  constructor() {
    this.database = new Database();
    this.sequelize = this.database.sequelize;
  }
  getBalanceFromWalletId(walletId) {
    return Transaction.findAll({
      attributes: [
        'currency',
        [ this.sequelize.fn('COALESCE', this.sequelize.fn('SUM', this.sequelize.col('amount')), 0), 'balance'],
      ],
      group: ['currency'],
      where: {
        ToWalletId: walletId,
      },
    });
  }

  async getCurrencyBalanceFromWalletId(currency, walletId) {
    const balanceCurrency = await Transaction.sum('amount', { where: { ToWalletId: walletId, currency: currency } });
    return balanceCurrency ? balanceCurrency : 0;
  }

}

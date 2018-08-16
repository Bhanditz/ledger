import { sequelize } from '../models';
import Transaction from '../models/Transaction';

export default class WalletUtil {

  getBalanceFromWalletId(walletId) {
    return Transaction.findAll({
      attributes: [
        'currency',
        [ sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('amount')), 0), 'balance'],
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

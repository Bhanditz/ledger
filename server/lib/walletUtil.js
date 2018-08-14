import models, { sequelize } from '../models';

export default class WalletUtil {

  getBalanceFromWalletId(walletId) {
    return models.Transaction.findAll({
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
    const balanceCurrency = await models.Transaction.sum('amount', { where: { ToWalletId: walletId, currency: currency } });
    return balanceCurrency ? balanceCurrency : 0;
  }

}

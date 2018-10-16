import Database from '../models';
import Transaction from '../models/Transaction';
import Wallet from '../models/Wallet';

export default class WalletLib {

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

  async findOrCreateTemporaryCurrencyWallet(currency, accountId){
    return Wallet.findOrCreate({
      where: {
        temporary: true,
        currency: currency,
        OwnerAccountId: accountId,
        name: `temp_${currency}_${accountId}`,
      },
    }).spread((result) => {
      return result;
    });
  }

}

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

  async findOrCreateCurrencyWallet(name, currency, accountId, ownerAccountId, temp){
    return Wallet.findOrCreate({
      where: {
        temporary: temp || false,
        currency: currency,
        AccountId: `${accountId}`,
        OwnerAccountId: `${ownerAccountId}`,
        name: `${name}`,
      },
    }).spread((result) => {
      return result;
    });
  }

  async findOrCreateTemporaryCurrencyWallet(currency, accountId, ownerAccountId){
    return this.findOrCreateCurrencyWallet(`temp_${currency}_${accountId}`, currency, accountId, ownerAccountId, true);
  }
}

import Database from '../models';
import LedgerTransaction from '../models/LedgerTransaction';
import Wallet from '../models/Wallet';
import { omit } from 'lodash';

export default class WalletLib {

  constructor() {
    this.database = new Database();
    this.sequelize = this.database.sequelize;
  }

  getBalanceFromWalletId(walletId) {
    return LedgerTransaction.findAll({
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
    const balanceCurrency = await LedgerTransaction.sum('amount', { where: { ToWalletId: walletId, currency: currency } });
    return balanceCurrency ? balanceCurrency : 0;
  }

  async findOrCreateCurrencyWallet(data, temp){
    return Wallet.findOrCreate({
      where: {
        currency: data.currency,
        AccountId: `${data.AccountId}`,
        OwnerAccountId: `${data.OwnerAccountId}`,
        name: `${data.name}`,
      },
      defaults: {
       temp: temp || false,
       ...omit(data, ['currency', 'AccountId', 'OwnerAccountId', 'name']),
      },
    }).spread((result) => {
      return result;
    });
  }

  async findOrCreateTemporaryCurrencyWallet(currency, AccountId, OwnerAccountId){
    return this.findOrCreateCurrencyWallet({
      name: `temp_${currency}_${AccountId}`,
      currency,
      AccountId,
      OwnerAccountId,
    }, true);
  }
}

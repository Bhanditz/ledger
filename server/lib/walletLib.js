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
    // setting where query
    const where = {
      currency: data.currency,
      AccountId: `${data.AccountId || 'UNKNOWN'}`,
      OwnerAccountId: `${data.OwnerAccountId || 'UNKNOWN'}`,
      name: `${data.name || 'UNKNOWN'}`,
    };
    // setting default fields
    let defaultFields = omit(data, ['currency', 'AccountId', 'OwnerAccountId', 'name']);
    // setting Payment method id on where query and ommiting from default fields
    if (data.PaymentMethodId) {
      where.PaymentMethodId = data.PaymentMethodId;
      defaultFields = omit(defaultFields, ['PaymentMethodId']);
    }
    // if there is no PaymentMethodId but there is OrderId, do as above
    if (!data.PaymentMethodId && data.OrderId) {
      where.OrderId = data.OrderId;
      defaultFields = omit(defaultFields, ['OrderId']);
    }
    // if there is no PaymentMethodId but there is ExpenseId, do as above
    if (!data.PaymentMethodId && data.ExpenseId) {
      where.ExpenseId = data.ExpenseId;
      defaultFields = omit(defaultFields, ['ExpenseId']);
    }
    return Wallet.findOrCreate({
      where,
      defaults: {
       temp: temp || false,
       ...defaultFields,
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

import Database from '../models';
import LedgerTransaction from '../models/LedgerTransaction';
import Wallet from '../models/Wallet';

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
    data.name = data.name || 'UNKNOWN';
    data.AccountId = `${data.AccountId || 'UNKNOWN'}`;
    data.OwnerAccountId = `${data.OwnerAccountId || 'UNKNOWN'}`;
    data.temporary = temp || false;
    // setting where query
    const where = {
      currency: data.currency,
      AccountId: data.AccountId,
      OwnerAccountId: data.OwnerAccountId,
    };
    // setting Payment method id on where query and ommiting from default fields
    if (data.PaymentMethodId) {
      where.PaymentMethodId = data.PaymentMethodId;
    }
    // Gift card consideration
    if (data.SourcePaymentMethodId) {
      where.SourcePaymentMethodId = data.SourcePaymentMethodId;
    }
    // if there is no PaymentMethodId but there is OrderId, do as above
    if (!data.PaymentMethodId && data.OrderId) {
      where.OrderId = data.OrderId;
    }
    // if there is no PaymentMethodId but there is ExpenseId, do as above
    if (!data.PaymentMethodId && data.ExpenseId) {
      where.ExpenseId = data.ExpenseId;
    }
    const walletFound = await Wallet.findOne({ where });
    if (walletFound) return walletFound;
    return Wallet.create(data);
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

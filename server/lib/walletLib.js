import Database from '../models';
import Transaction from '../models/Transaction';
import { paymentMethodServices } from '../globals/enums/paymentMethodServices';

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

  static IsPaymentMethodTypeInCorrectService(service, type) {
    switch (service) {
      case paymentMethodServices.opencollective.name:
        if (Object.values(paymentMethodServices.opencollective.types).find(objType => objType === type))
          return true;
        break;
      case paymentMethodServices.paypal.name:
        if (Object.values(paymentMethodServices.paypal.types).find(objType => objType === type))
          return true;
        break;
      case paymentMethodServices.stripe.name:
        if (Object.values(paymentMethodServices.stripe.types).find(objType => objType === type))
          return true;
        break;
      default:
        return false;
    }
  }

}

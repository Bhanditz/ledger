import AbstractFeeTransactions from './abstractFeeTransactions';
import { constants } from '../../globals/constants';
import Wallet from '../../models/Wallet';
import { paymentMethodServices } from '../../globals/enums/paymentMethodServices';
import { operationNotAllowed } from '../../globals/errors';
import PayPalLib from '../paymentProviders/paypalLib';
import StripeLib from '../paymentProviders/stripeLib';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    const fromWallet = await Wallet.findById(this.transaction.FromWalletId);
    switch (fromWallet.service) {
      case paymentMethodServices.paypal.name:
        this.feeAccountId = constants.PAYPAL_ACCOUNT_ID;
        this.feeWalletId = constants.PAYPAL_WALLET_ID;
        this.fee = await PayPalLib.getFees(this.transaction);
        break;
      case paymentMethodServices.stripe.name:
        this.feeAccountId = constants.PAYPAL_ACCOUNT_ID;
        this.feeWalletId = constants.PAYPAL_WALLET_ID;
        this.fee = await StripeLib.getFees(this.transaction);
        break;
      default:
        throw Error(operationNotAllowed('Wrong Payment Method was setup.'));
    }
  }

}

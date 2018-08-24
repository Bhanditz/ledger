import AbstractPaymentProviderLib from './abstractPaymentProviderLib';

export default class PaypalLib extends AbstractPaymentProviderLib{
  static async getFees(transaction) {
    // TODO: USE paypal lib
    return transaction * 0.04;
  }
}
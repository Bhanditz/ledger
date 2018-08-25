import AbstractPaymentProviderLib from './abstractPaymentProviderLib';

export default class StripeLib extends AbstractPaymentProviderLib {
  static async getFees(transaction) {
    // TODO: USE stripe lib
    return transaction.amount * 0.03;
  }
}

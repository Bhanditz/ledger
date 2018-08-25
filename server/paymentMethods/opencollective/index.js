import AbstractPaymentMethod from '../abstractPaymentMethodType';

export default class OpenCollectivePaymentMethod extends AbstractPaymentMethod {

  constructor(type) {
    super(type, __dirname);
  }

  processOrder(order) {
    super.processOrder(order);
  }

}

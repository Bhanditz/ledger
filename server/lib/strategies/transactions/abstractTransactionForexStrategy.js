import AbstractTransactionStrategy from './abstractTransactionStrategy';
import { operationNotAllowed } from '../../../globals/errors';

export default class AbstractTransactionForexStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    if (!this.hasRequiredForexFields()) {
      throw Error(operationNotAllowed('Missing forex fields'));
    }
    this.incomingTransaction.transactionGroupTotalAmountInDestinationCurrency = this.incomingTransaction.destinationAmount;
  }

  hasRequiredForexFields() {
    if (this.incomingTransaction.FromDestinationCurrencyWalletId && this.incomingTransaction.destinationAmount &&
        this.incomingTransaction.destinationCurrency && this.incomingTransaction.paymentProviderDestinationCurrencyWalletId) {
      return true;
    }
    return false;
  }

}

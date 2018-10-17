import AbstractTransactionStrategy from './abstractTransactionStrategy';
import { operationNotAllowed } from '../globals/errors';

export default class AbstractTransactionForexStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this._validateForexTransaction();
  }

  getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction) {
    let netTransactionAmount = this.incomingTransaction.destinationAmount;
    if (paymentProviderFeeTransactions) {
      netTransactionAmount -= paymentProviderFeeTransactions.getTotalFee();
    }
    if (platformFeeTransaction) {
      netTransactionAmount -= platformFeeTransaction.getTotalFee();
    }
    if (providerFeeTransaction) {
      netTransactionAmount -= providerFeeTransaction.getTotalFee();
    }
    return netTransactionAmount;
  }

  _validateForexTransaction() {
    if (!this.incomingTransaction.destinationAmount) {
      throw Error(operationNotAllowed('field destinationAmount missing'));
    }
    if (!this.incomingTransaction.destinationCurrency) {
      throw Error(operationNotAllowed('field destinationCurrency missing'));
    }
  }

}

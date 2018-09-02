import AbstractFeeTransactions from './abstractFeeTransactions';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeWalletId = this.transaction.paymentProviderWalletId;
    this.feeAccountId = this.transaction.paymentProvider.OwnerAccountId;
    this.fee = this.transaction.paymentProviderFee;
  }

}

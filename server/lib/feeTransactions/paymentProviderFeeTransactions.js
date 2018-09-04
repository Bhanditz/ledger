import AbstractFeeTransactions from './abstractFeeTransactions';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeWalletId = this.transaction.paymentProviderWallet.id;
    this.feeAccountId = this.transaction.paymentProviderWallet.OwnerAccountId;
    this.fee = this.transaction.paymentProviderFee;
  }

}

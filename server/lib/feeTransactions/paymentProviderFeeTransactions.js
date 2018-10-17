import AbstractFeeTransactions from './abstractFeeTransactions';
import transactionCategoryEnum from '../../globals/enums/transactionCategoryEnum';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeWalletId = this.transaction.PaymentProviderWalletId;
    this.feeAccountId = this.transaction.PaymentProviderAccountId;
    this.fee = this.transaction.paymentProviderFee;
    this.category = transactionCategoryEnum.PAYMENT_PROVIDER;
  }

}

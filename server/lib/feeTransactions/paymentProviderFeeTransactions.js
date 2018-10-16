import AbstractFeeTransactions from './abstractFeeTransactions';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeWalletId = this.transaction.paymentProviderWalletId;
    this.feeAccountId = this.transaction.paymentProviderAccountId;
    this.fee = this.transaction.paymentProviderFee;
    this.category = transactionCategoryEnum.PAYMENT_PROVIDER;
  }

}

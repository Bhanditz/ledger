import AbstractFeeTransactions from './abstractFeeTransactions';
import Account from '../../models/Account';
import Wallet from '../../models/Wallet';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';

export default class PaymentProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    const wallet = await Wallet.findById(this.transaction.paymentProviderWalletId);
    const account = await Account.findById(wallet.OwnerAccountId);
    this.feeWalletId = this.transaction.paymentProviderWalletId;
    this.feeAccountId = account.id;
    this.fee = this.transaction.paymentProviderFee;
    this.category = transactionCategoryEnum.PAYMENT_PROVIDER;
  }

}

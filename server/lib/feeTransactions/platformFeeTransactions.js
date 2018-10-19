import AbstractFeeTransactions from './abstractFeeTransactions';
import transactionCategoryEnum from '../../globals/enums/transactionCategoryEnum';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    this.feeAccountId = this.transaction.PlatformAccountId;
    this.feeWalletId = this.transaction.PlatformWalletId;
    this.fee = this.transaction.platformFee;
    this.category = transactionCategoryEnum.PLATFORM;
  }

}

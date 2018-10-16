import AbstractFeeTransactions from './abstractFeeTransactions';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';

export default class WalletProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeAccountId = this.transaction.walletProviderWalletId;
    this.feeWalletId = this.transaction.walletProviderAccountId;
    this.fee = this.transaction.platformFee;
    this.category = transactionCategoryEnum.PLATFORM;
  }

}

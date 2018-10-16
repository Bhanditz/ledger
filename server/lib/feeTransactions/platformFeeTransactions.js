import AbstractFeeTransactions from './abstractFeeTransactions';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';
import { constants } from '../../globals/constants';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    this.feeAccountId = constants.PLATFORM_ACCOUNT_ID;
    this.feeWalletId = constants.PLATFORM_WALLET_ID;
    this.fee = this.transaction.platformFee;
    this.category = transactionCategoryEnum.PLATFORM;
  }

}

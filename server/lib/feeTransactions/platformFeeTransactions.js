import AbstractFeeTransactions from './abstractFeeTransactions';
import PlatformInfo from '../../globals/platformInfo';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    try {
      const platformAccount = await PlatformInfo.getAccount();
      const platformWallet = await PlatformInfo.getWallet();
      this.feeAccountId = platformAccount.id;
      this.feeWalletId = platformWallet.id;
      this.fee = this.transaction.platformFee;
      this.category = transactionCategoryEnum.PLATFORM;
    } catch (error) {
      throw error;
    }
  }

}

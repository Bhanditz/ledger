import AbstractFeeTransactions from './abstractFeeTransactions';
import PlatformInfo from '../globals/platformInfo';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    try {
      const platformAccount = await PlatformInfo.getAccount();
      const platformWallet = await PlatformInfo.getWallet();
      this.feeAccountId = platformAccount.id;
      this.feeWalletId = await platformWallet.id;
      this.fee = this.transaction.platformFee;
    } catch (error) {
      throw error;
    }
  }

}

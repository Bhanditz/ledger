import AbstractFeeTransactions from './abstractFeeTransactions';
import PlatformInfo from '../../globals/platformInfo';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    try {
      this.feeAccountId = await PlatformInfo.getAccount().id;
      this.feeWalletId = await PlatformInfo.getWallet().id;
      this.fee = this.transaction.platformFee;
    } catch (error) {
      throw error;
    }
  }

}

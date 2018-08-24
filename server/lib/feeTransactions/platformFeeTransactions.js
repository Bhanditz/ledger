import AbstractFeeTransactions from './abstractFeeTransactions';
import { constants } from '../../globals/constants';

export default class PlatformFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeAccountId = constants.PLATFORM_ACCOUNT_ID;
    this.feeWalletId = constants.PLATFORM_WALLET_ID;
    // setting platform fee to defaults 5%
    this.fee = 0.05 * this.transaction.amount;
  }

}

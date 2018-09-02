import AbstractFeeTransactions from './abstractFeeTransactions';
import { constants } from '../../globals/constants';

export default class WalletProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  setTransactionInfo() {
    this.feeAccountId = constants.PLATFORM_ACCOUNT_ID;
    this.feeWalletId = constants.PLATFORM_WALLET_ID;
    const fixedFee = this.transaction.fromWalletProvider.fixedFee ? this.transaction.fromWalletProvider.fixedFee : 0;
    const percentFee = this.transaction.fromWalletProvider.percentFee ? this.transaction.fromWalletProvider.percentFee : 0;
    this.fee = fixedFee + (this.transaction.amount * percentFee);
  }

}

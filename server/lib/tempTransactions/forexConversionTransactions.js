import AbstractTempTransactions from './abstractTempTransactions';
import Account from '../../models/Account';
import Wallet from '../../models/Wallet';

export default class ForexConversionTransactions extends AbstractTempTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    const wallet = await Wallet.findById(this.transaction.paymentProviderWalletId);
    const account = await Account.findById(wallet.OwnerAccountId);
    this.feeWalletId = this.transaction.paymentProviderWalletId;
    this.feeAccountId = account.id;
    this.fee = this.transaction.paymentProviderFee;
  }

}

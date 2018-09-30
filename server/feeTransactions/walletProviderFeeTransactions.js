import AbstractFeeTransactions from './abstractFeeTransactions';
import ProviderLib from '../lib/providerLib';

export default class WalletProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
    this.providerLib = new ProviderLib();
  }

  async setTransactionInfo() {
    try {
      this.feeAccountId = this.transaction.fromWalletProvider.OwnerAccountId;
      const providerCurrencyWallet = await this.providerLib.findOrCreateWalletByCurrency(this.transaction.fromWalletProvider, this.transaction.currency);
      this.feeWalletId = providerCurrencyWallet.id;
      const fixedFee = this.transaction.fromWalletProvider.fixedFee ? this.transaction.fromWalletProvider.fixedFee : 0;
      const percentFee = this.transaction.fromWalletProvider.percentFee ? this.transaction.fromWalletProvider.percentFee : 0;
      this.fee = fixedFee + (this.transaction.amount * percentFee);
    } catch (error) {
      throw error;
    }
  }

}

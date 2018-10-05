import AbstractFeeTransactions from './abstractFeeTransactions';
import ProviderLib from '../providerLib';
import { transactionCategoryEnum } from '../../globals/enums/transactionCategoryEnum';

export default class WalletProviderFeeTransactions extends AbstractFeeTransactions {

  constructor(transaction) {
    super(transaction);
  }

  async setTransactionInfo() {
    try {
      console.log(`this.transaction.fromWalletProvider: ${JSON.stringify(this.transaction.fromWalletProvider, null,2)}`);
      const providerLib = new ProviderLib();
      this.feeAccountId = this.transaction.fromWalletProvider.OwnerAccountId;
      const currency = this.transaction.destinationCurrency ||  this.transaction.currency;
      const providerCurrencyWallet = await providerLib.findOrCreateWalletByCurrency(this.transaction.fromWalletProvider, currency);
      this.feeWalletId = providerCurrencyWallet.id;
      const fixedFee = this.transaction.fromWalletProvider.fixedFee ? this.transaction.fromWalletProvider.fixedFee : 0;
      const percentFee = this.transaction.fromWalletProvider.percentFee ? this.transaction.fromWalletProvider.percentFee : 0;
      // check if it's a forex or regular transaction
      const amount = this.transaction.destinationAmount ||  this.transaction.amount;
      this.fee = fixedFee + (amount * percentFee);
      this.category = transactionCategoryEnum.WALLET_PROVIDER;
    } catch (error) {
      throw error;
    }
  }

}

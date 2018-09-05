import AccountService from '../services/accountService';
import { constants } from './constants';
import { NOT_FOUND } from './errors';
import WalletService from '../services/walletService';

// Lazy load of Load Platform Info (Account and Wallet)
export default class PlatformInfo {

  static async getAccount() {
    if (!this.account) {
      const accountService = new AccountService();
      const accounts = await accountService.get({ slug: constants.PLATFORM_ACCOUNT_SLUG });
      if (!accounts || accounts.length <= 0) {
        throw new Error(NOT_FOUND);
      }
      this.account = accounts[0];
    }
    return this.account;
  }

  static async getWallet() {
    if (!this.wallet) {
      const walletService = new WalletService();
      const account = await this.getAccount();
      const wallets = await walletService.get({ OwnerAccountId: account.id });
      if (!wallets || wallets.length <= 0) {
        throw new Error(NOT_FOUND);
      }
      this.wallet = wallets[0];
    }
    return this.wallet;
  }


}

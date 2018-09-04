import Account from '../models/Account';

export default class AccountLib {

  async getDefaultCashWalletId(accountId, field) {
    const account = await Account.findById(accountId);
    if (!account) {
      throw Error(`Account id ${accountId} not found in database`);
    }
    if (!account[field]) {
      throw Error(`Account id ${accountId} does not have ${field}`);
    }
    return account[field];
  }

  getDefaultCashinWalletId(accountId) {
    return this.getDefaultCashWalletId(accountId, 'DefaultCashinWalletId');
  }

  getDefaultCashoutWalletId(accountId) {
    return this.getDefaultCashWalletId(accountId, 'DefaultCashoutWalletId');
  }
}

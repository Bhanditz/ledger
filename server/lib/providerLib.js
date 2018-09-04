import Database from '../models';
import Account from '../models/Account';
import Wallet from '../models/Wallet';

export default class ProviderLib {

  constructor() {
    this.database = new Database();
    this.sequelize = this.database.sequelize;
  }

  async findOrCreateWalletByCurrency(provider, currency) {
    try {
      // Checks whether provider wallet already exists for given currency
      const wallets = await Wallet.findAll({
        where: {
          OwnerAccountId: provider.OwnerAccountId,
          ProviderId: null,
          currency: currency,
        },
      });
      if (wallets && wallets.length > 0) {
        return wallets[0];
      }
      // if it doesn't exist then creates one with ProviderId as Null
      const ownerAccount = await Account.findById(provider.OwnerAccountId);
      const wallet = await Wallet.create({
        OwnerAccountId: ownerAccount.id,
        currency: currency,
        name: `${ownerAccount.slug}_${currency}`,
        ProviderId: null,
      });
      return wallet;
    } catch (error) {
      throw error;
    }
    
  }

}

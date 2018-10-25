/**
 * Test around the @{Wallets}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import ResetDb from '../resetDb';
import WalletLib from '../../server/lib/walletLib';
import WalletService from '../../server/services/walletService';

describe('Wallets', () => {
  const lib = new WalletLib();
  const service = new WalletService();

  beforeEach(async () => {
    await ResetDb.run();
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  describe('Creation', () => {
    it('cannot create wallet without required fields', async () => {
      try {
        await service.insert({
          currency: 'USD',
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('cannot be null');
      }
    }); /** End of "" */

    it('if currency is not defined, currency saved must be null', async () => {
      const wallet = await service.insert({
        name: 'bob_wallet',
        AccountId: 'bob',
        OwnerAccountId: 'opencollective',
      });
      expect(wallet.currency).to.be.null;
    }); /** End of "" */
    
    it('should create a wallet succesfully', async () => {
      const wallet = await service.insert({
        name: 'bob_wallet',
        currency: 'USD',
        AccountId: 'bob',
        OwnerAccountId: 'opencollective',
      });
      expect(wallet.name).to.equal('bob_wallet');
      expect(wallet.currency).to.equal('USD');
      expect(wallet.AccountId).to.equal('bob');
      expect(wallet.OwnerAccountId).to.equal('opencollective');
      
    }); /** End of "" */

    it('should create a temporary wallet succesfully', async () => {
      const wallet = await service.insert({
        name: 'bob_wallet',
        currency: 'USD',
        AccountId: 'bob',
        OwnerAccountId: 'opencollective',
        temporary: true,
      });
      expect(wallet.name).to.equal('bob_wallet');
      expect(wallet.currency).to.equal('USD');
      expect(wallet.temporary).to.equal(true);
      expect(wallet.AccountId).to.equal('bob');
      expect(wallet.OwnerAccountId).to.equal('opencollective');
    }); /** End of "" */

    it('should not create a wallet with duplicated data', async () => {
      try {
        await service.insert({
          name: 'bob_wallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'opencollective',
          temporary: true,
        });
        await service.insert({
          name: 'bob_wallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'opencollective',
          temporary: true,
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('SequelizeUniqueConstraintError');
      }
    }); /** End of "" */

    it('should find a wallet instead of create using findOrCreate', async () => {
      const wallet1 = await lib.findOrCreateCurrencyWallet({
        name: 'bob_wallet',
        currency: 'USD', 
        AccountId: 'bob', 
        OwnerAccountId: 'opencollective',
      });
      const wallet2 = await lib.findOrCreateCurrencyWallet({
        name: 'bob_wallet',
        currency: 'USD', 
        AccountId: 'bob', 
        OwnerAccountId: 'opencollective',
      });
      // wallet1 should match properties of creation
      expect(wallet1.name).to.equal('bob_wallet');
      expect(wallet1.currency).to.equal('USD');
      expect(wallet1.AccountId).to.equal('bob');
      expect(wallet1.OwnerAccountId).to.equal('opencollective');
      // wallet2 should match properties of creation
      expect(wallet2.name).to.equal('bob_wallet');
      expect(wallet2.currency).to.equal('USD');
      expect(wallet2.AccountId).to.equal('bob');
      expect(wallet2.OwnerAccountId).to.equal('opencollective');
      // wallet1 Id should be the same of wallet2 because method findOrCreateCurrencyWallet FOUND 
      // an already existing wallet with same property
      expect(wallet1.id).to.equal(wallet2.id);
    }); /** End of "" */

  });

}); /** End of "Wallets" */

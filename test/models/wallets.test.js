/**
 * Test around the @{Wallets CRUD}
 *
 * @module test/models
 */
import { expect } from 'chai';
import AccountService from '../../server/services/accountService';
import WalletService from '../../server/services/walletService';
import ResetDb from '../../server/util/resetDb';
import { paymentMethodServices } from '../../server/globals/enums/paymentMethodServices';
import { operationNotAllowed } from '../../server/globals/errors';

describe('Wallets CRUD', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  
  after(async () => {
    await ResetDb.run();
  });

  describe('Wallets Creation', () => {
    let account;

    before(async () => {
      await ResetDb.run();
    });

    it('Creates an Account', async () => {
      const accountSlug = 'bobAccount';
      account = await accountService.insert({ slug: accountSlug });
      expect(account).to.have.property('slug');
      expect(account.slug).to.be.equal(accountSlug);
    }); /** End of "Creates an Account" */

    it('should fail to Create a Wallet that has Service that does not Exist in the paymentMethodsServices List', async () => {
      const walletName = 'opencollective_collective';
      const walletCurrency = 'USD';
      try {
        await walletService.insert({
          OwnerAccountId: account.id,
          currency: walletCurrency,
          name: walletName,
          paymentMethodService: 'NOT_EXISTING_SERVICE',
          paymentMethodType: paymentMethodServices.opencollective.types.COLLECTIVE,
        });
        throw Error('Should Not Get here');  
      } catch (error) {
        expect(error).to.exist;
        expect(error.errors).to.have.length.above(0);
        expect(error.errors[0]).to.have.property('message');
        expect(error.errors[0].message).to.be.equal('Validation isIn on paymentMethodService failed');
      }
    }); /** End of "should fail to Create a Wallet that has Service that does not Exist in the paymentMethodsServices List" */

    it('should fail to Create a Wallet that has Type that does not Exist in the globals/enums/paymentMethodServices List', async () => {
      const walletName = 'opencollective_collective';
      const walletCurrency = 'USD';
      try {
        await walletService.insert({
          OwnerAccountId: account.id,
          currency: walletCurrency,
          name: walletName,
          paymentMethodService: paymentMethodServices.opencollective.name,
          paymentMethodType: 'NOT_EXISTING_TYPE',
        });
        throw Error('Should Not Get here');  
      } catch (error) {
        expect(error).to.exist;
        expect(error.errors).to.have.length.above(0);
        expect(error.errors[0]).to.have.property('message');
        expect(error.errors[0].message).to.be.equal('Validation isIn on paymentMethodType failed');
      }
      
    }); /** End of "should fail to Create a Wallet that has Type that does not Exist in the globals/enums/paymentMethodServices List" */

    it('should fail if payment method type does not belong to payment method service', async () => {
      const walletPaymentMethodService = paymentMethodServices.stripe.name;
      const walletPaymentMethodType = paymentMethodServices.opencollective.types.COLLECTIVE;
      try {
        await walletService.insert({
          OwnerAccountId: account.id,
          currency: 'USD',
          name: 'account1_USD',
          paymentMethodService: walletPaymentMethodService,
          paymentMethodType: walletPaymentMethodType,
        });  
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain(operationNotAllowed(`Payment Method type ${walletPaymentMethodType} ` +
          `is not part of Service ${walletPaymentMethodService}`));
      }
    }); /** End of "should fail if payment method type does not belong to payment method service" */

    it('Creates a Wallet that has Service OPENCOLLECTIVE and Type COLLECTIVE', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.opencollective.name,
        paymentMethodType: paymentMethodServices.opencollective.types.COLLECTIVE,
      });

      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.opencollective.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.opencollective.types.COLLECTIVE);
    }); /** End of "Creates a Wallet that has Service OPENCOLLECTIVE and Type COLLECTIVE" */

    it('Creates a Wallet that has Service OPENCOLLECTIVE and Type GIFTCARD', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.opencollective.name,
        paymentMethodType: paymentMethodServices.opencollective.types.GIFTCARD,
      });
      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.opencollective.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.opencollective.types.GIFTCARD);
    }); /** End of "Creates a Wallet that has Service OPENCOLLECTIVE and Type GIFTCARD" */

    it('Creates a Wallet that has Service OPENCOLLECTIVE and Type PREPAID', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.opencollective.name,
        paymentMethodType: paymentMethodServices.opencollective.types.PREPAID,
      });
      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.opencollective.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.opencollective.types.PREPAID);
    }); /** End of "Creates a Wallet that has Service OPENCOLLECTIVE and Type PREPAID" */

    it('Creates a Wallet that has Service PAYPAL and Type ADAPTIVE', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.paypal.name,
        paymentMethodType: paymentMethodServices.paypal.types.ADAPTIVE,
      });
      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.paypal.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.paypal.types.ADAPTIVE);
    }); /** End of "Creates a Wallet that has Service PAYPAL and Type ADAPTIVE" */

    it('Creates a Wallet that has Service PAYPAL and Type PAYMENT', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.paypal.name,
        paymentMethodType: paymentMethodServices.paypal.types.PAYMENT,
      });
      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.paypal.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.paypal.types.PAYMENT);
    }); /** End of "Creates a Wallet that has Service STRIPE and Type PAYMENT" */

    it('Creates a Wallet that has Service STRIPE and Type CREDITCARD', async () => {
      const walletName = 'walletName';
      const walletCurrency = 'USD';
      const wallet  = await walletService.insert({
        OwnerAccountId: account.id,
        currency: walletCurrency,
        name: walletName,
        paymentMethodService: paymentMethodServices.stripe.name,
        paymentMethodType: paymentMethodServices.stripe.types.CREDITCARD,
      });
      expect(wallet).to.have.property('OwnerAccountId');
      expect(wallet).to.have.property('currency');
      expect(wallet).to.have.property('name');
      expect(wallet.OwnerAccountId).to.be.equal(account.id);
      expect(wallet.currency).to.be.equal(walletCurrency);
      expect(wallet.name).to.be.equal(walletName);
      expect(wallet.paymentMethodService).to.be.equal(paymentMethodServices.stripe.name);
      expect(wallet.paymentMethodType).to.be.equal(paymentMethodServices.stripe.types.CREDITCARD);
    }); /** End of "Creates a Wallet that has Service STRIPE and Type CREDITCARD" */

  }); /** End of "Wallets Creation" */

}); /** End of "Wallets CRUD" */

/**
 * Test around the @{Wallet Service STRIPE Type CREDITCARD}
 *
 * @module test/transactions
 */
// import { expect } from 'chai';
// import TransactionService from '../server/services/transactionService';
// import AccountService from '../server/services/accountService';
// import WalletService from '../server/services/walletService';
import ResetDb from '../../../server/util/resetDb';
// import { transactionTypeEnum } from '../server/globals/enums/transactionTypeEnum';
// import WalletLib from '../server/lib/walletLib';

describe('wallet.stripe.creditcard', () => {
  // const transactionService = new TransactionService();
  // const accountService = new AccountService();
  // const walletService = new WalletService();
  
  after(async () => {
    await ResetDb.run();
  });
  
  describe('FromWalletId refers a Wallet that has Service STRIPE and Type CREDITCARD On a Transaction', () => {

    describe('ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type COLLECTIVE', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('should fail because FromWalletId Has no Balance', () => {
      }); /** End of "should fail because FromWalletId Has no Balance" */
  
    }); /** End of "ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type COLLECTIVE" */
  
    describe('ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type GIFTCARD', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('', () => {
      }); /** End of "" */
    }); /** End of "ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type GIFTCARD" */
  
    describe('ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type PREPAID', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('', () => {
      }); /** End of "" */
  
    }); /** End of "ToWalletId refers a Wallet that has Service OPENCOLLECTIVE and Type PREPAID" */
  
    describe('ToWalletId refers a Wallet that has Service PAYPAL and Type ADAPTIVE', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('', () => {
      }); /** End of "" */
  
    }); /** End of "ToWalletId refers a Wallet that has Service PAYPAL and Type ADAPTIVE" */
  
    describe('ToWalletId refers a Wallet that has Service PAYPAL and Type PAYMENT', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('', () => {
      }); /** End of "" */
  
    }); /** End of "ToWalletId refers a Wallet that has Service PAYPAL and Type PAYMENT" */
  
    describe('ToWalletId refers a Wallet that has Service STRIPE and Type CREDITCARD', () => {
  
      beforeEach(async () => {
        await ResetDb.run();
      });
  
      it('', () => {
      }); /** End of "" */
  
    }); /** End of "ToWalletId refers a Wallet that has Service STRIPE and Type CREDITCARD" */

  });/** End of "FromWalletId refers a Wallet that has Service STRIPE and Type CREDITCARD On a Transaction" */
  

});



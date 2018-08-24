/**
 * Test around the @{Transactions CRUD}
 *
 * @module test/models
 */
import { expect } from 'chai';
import AccountService from '../../server/services/accountService';
import WalletService from '../../server/services/walletService';
import TransactionService from '../../server/services/transactionService';
import ResetDb from '../../server/util/resetDb';
import { paymentMethodServices } from '../../server/globals/enums/paymentMethodServices';
import { operationNotAllowed } from '../../server/globals/errors';
import { transactionTypeEnum } from '../../server/globals/enums/transactionTypeEnum';

describe('Transactions CRUD', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  const transactionService = new TransactionService();
  
  after(async () => {
    await ResetDb.run();
  });

  describe('Transactions Creation', () => {
    let account1, account2, walletAccount1Usd, walletAccount1CC, walletAccount2Usd;

    beforeEach(async () => {
      await ResetDb.run();
      // Creates 2 Accounts
      account1 = await accountService.insert({ slug: 'account1' });
      account2 = await accountService.insert({ slug: 'account2' });
      walletAccount1Usd = await walletService.insert({
        OwnerAccountId: account1.id,
        currency: 'USD',
        name: 'account1_USD',
        service: paymentMethodServices.opencollective.name,
        type: paymentMethodServices.opencollective.types.COLLECTIVE,
      });
      walletAccount1CC = await walletService.insert({
        OwnerAccountId: account1.id,
        currency: 'USD',
        name: 'account1_CC',
        service: paymentMethodServices.stripe.name,
        type: paymentMethodServices.stripe.types.CREDITCARD,
      });
      walletAccount2Usd = await walletService.insert({
        OwnerAccountId: account2.id,
        currency: 'USD',
        name: 'account2_USD',
        service: paymentMethodServices.opencollective.name,
        type: paymentMethodServices.opencollective.types.COLLECTIVE,
      });
    });

    it('fails to create a transaction because Wallet does not have balance', async () => {
      try {
        await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account2.id, FromWalletId: walletAccount1Usd.id, ToWalletId: walletAccount2Usd.id, amount: 15, currency: 'USD' });  
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain(operationNotAllowed(`Wallet(id ${walletAccount1Usd.id}) does not have enough balance to complete transaction`));
      }
    }); /** End of "fails to create a transaction because Wallet does not have balance" */

    it('Creates a Cashin Transaction', async () => {
      const amountTransaction = 15;
      const currencyTransaction = 'USD';
      const cashinResult = await transactionService.insert({
        FromAccountId: account1.id,
        ToAccountId: account1.id,
        FromWalletId:walletAccount1CC.id,
        ToWalletId: walletAccount1Usd.id,
        amount: amountTransaction,
        currency: currencyTransaction,
      });
      // check if initial Cashin transaction generates 2 transactions(DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(2);
      const debitTransaction = cashinResult[0];
      const creditTransaction = cashinResult[1];
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(debitTransaction.FromAccountId).to.be.equal(debitTransaction.ToAccountId);
      expect(creditTransaction.FromAccountId).to.be.equal(creditTransaction.ToAccountId);
      // amount should be negative in Debit transaction and the same in Credit transaction
      expect(debitTransaction.amount).to.be.equal(-1 * amountTransaction);
      expect(creditTransaction.amount).to.be.equal(amountTransaction);
      // currencies should be the same as original transaction
      expect(debitTransaction.currency).to.be.equal(currencyTransaction);
      expect(creditTransaction.currency).to.be.equal(currencyTransaction);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(debitTransaction.FromWalletId).to.be.equal(creditTransaction.ToWalletId);
      expect(creditTransaction.FromWalletId).to.be.equal(debitTransaction.ToWalletId);      
    }); /** End of "Creates a Cashin Transaction" */

    it('account1 Cashes 15USD in and send 15USD to account2', async () => {
      const amountTransaction = 15;
      const currencyTransaction = 'USD';
      const cashinResult = await transactionService.insert({
        FromAccountId: account1.id,
        ToAccountId: account1.id,
        FromWalletId:walletAccount1CC.id,
        ToWalletId: walletAccount1Usd.id,
        amount: amountTransaction,
        currency: currencyTransaction,
      });
      // check if initial Cashin transaction generates 2 transactions(DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(2);
      const debitCashinTransaction = cashinResult[0];
      const creditCashinTransaction = cashinResult[1];
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(debitCashinTransaction.FromAccountId).to.be.equal(debitCashinTransaction.ToAccountId);
      expect(creditCashinTransaction.FromAccountId).to.be.equal(creditCashinTransaction.ToAccountId);
      // amount should be negative in Debit transaction and the same in Credit transaction
      expect(debitCashinTransaction.amount).to.be.equal(-1 * amountTransaction);
      expect(creditCashinTransaction.amount).to.be.equal(amountTransaction);
      // currencies should be the same as original transaction
      expect(debitCashinTransaction.currency).to.be.equal(currencyTransaction);
      expect(creditCashinTransaction.currency).to.be.equal(currencyTransaction);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(debitCashinTransaction.FromWalletId).to.be.equal(creditCashinTransaction.ToWalletId);
      expect(creditCashinTransaction.FromWalletId).to.be.equal(debitCashinTransaction.ToWalletId);
      
      const transactionResult = await transactionService.insert({
        FromAccountId: account1.id,
        ToAccountId: account2.id,
        FromWalletId: walletAccount1Usd.id, 
        ToWalletId:walletAccount1CC.id,
        amount: amountTransaction,
        currency: currencyTransaction,
      });
      // check if transaction generates 2 transactions(DEBIT AND CREDIT)
      expect(transactionResult).to.be.an('array');
      expect(transactionResult).to.have.lengthOf(2);
      const debitTransaction = transactionResult[0];
      expect(debitTransaction.type).to.be.equal(transactionTypeEnum.DEBIT);
      const creditTransaction = transactionResult[1];
      expect(creditTransaction.type).to.be.equal(transactionTypeEnum.CREDIT);
      // FromAccountID and ToAccountId should be the opposite in Debit and Credit Transactions
      expect(debitTransaction.FromAccountId).to.be.equal(creditTransaction.ToAccountId);
      expect(debitTransaction.FromAccountId).to.be.equal(creditTransaction.ToAccountId);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(debitTransaction.FromWalletId).to.be.equal(creditTransaction.ToWalletId);
      expect(creditTransaction.FromWalletId).to.be.equal(debitTransaction.ToWalletId);
      // amount should be negative in Debit transaction and the same in Credit transaction
      expect(debitTransaction.amount).to.be.equal(-1 * amountTransaction);
      expect(creditTransaction.amount).to.be.equal(amountTransaction);
      // currencies should be the same as original transaction
      expect(debitTransaction.currency).to.be.equal(currencyTransaction);
      expect(creditTransaction.currency).to.be.equal(currencyTransaction);

    }); /** End of "account1 Cashes 15USD in and send 15USD to account2" */

  }); /** End of "Transactions Creation" */

}); /** End of "Transactions CRUD" */

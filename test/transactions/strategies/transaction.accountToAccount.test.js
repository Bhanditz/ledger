/**
 * Test around the @{TransactionService}
 *
 * @module test/user/service
 */
import { expect } from 'chai';
import TransactionService from '../../../server/services/transactionService';
import AccountService from '../../../server/services/accountService';
import WalletService from '../../../server/services/walletService';
import ResetDb from '../../resetDb';
import WalletLib from '../../../server/lib/walletLib';
import ProviderService from '../../../server/services/providerService';
import { paymentMethodServices } from '../../../server/globals/enums/paymentMethodServices';

describe('TransactionAccountToAccount', () => {
  const transactionService = new TransactionService();
  const accountService = new AccountService();
  const walletService = new WalletService();
  const providerService = new ProviderService();
  const walletLib = new WalletLib();

  let account1, account1FirstWalletUsd, account1SecondWalletUsd, account1WalletCreditCard,
      account2, account2WalletUsd, account2WalletCreditCard,
      accountProvider, provider;

  beforeEach(async () => {
    await ResetDb.run();
    // Creating Provider Account and its wallet
    accountProvider = await accountService.insert({ slug: 'provider_usd' });
    provider = await providerService.insert({
      name: 'provider_USD',
      fixedFee: 0,
      percentFee: 0.05,
      service: paymentMethodServices.opencollective.name,
      type: paymentMethodServices.opencollective.types.COLLECTIVE,
      OwnerAccountId: accountProvider.id,
    });
    await walletService.insert({
      OwnerAccountId: accountProvider.id,
      currency: 'USD',
      name: 'provider_USD',
      ProviderId: null,
    });

    // Creates Account1 Account and its wallets
    account1 = await accountService.insert({ slug: 'account1' });
    // Creating First Wallet of account1
    account1FirstWalletUsd = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'USD',
      name: 'account1-USD-first',
      ProviderId: provider.id,
    });
    // Creating Second Wallet of account1
    account1SecondWalletUsd = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'USD',
      name: 'account1-USD-second',
      ProviderId: provider.id,
    });
    // Creating Credit Card Wallet of Regular Account
    account1WalletCreditCard = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'USD',
      name: 'account1-CC-USD',
      ProviderId: provider.id,
    });

    // Creates Account2 Account and its wallets
    account2 = await accountService.insert({ slug: 'account2' });
    // Creating First Wallet of account1
    account2WalletUsd = await walletService.insert({
      OwnerAccountId: account2.id,
      currency: 'USD',
      name: 'account2-USD-first',
      ProviderId: provider.id,
    });
    // Creating Credit Card Wallet of Regular Account
    account2WalletCreditCard = await walletService.insert({
      OwnerAccountId: account2.id,
      currency: 'USD',
      name: 'account2-CC-USD',
      ProviderId: provider.id,
    });

    // Using Credit card wallets from account1 and account2 to top up 
    // their first wallets with U$500
    const amountTransaction = 50000;
    const currencyTransaction = 'USD';
    await transactionService.insert({
      FromWalletId: account1WalletCreditCard.id,
      ToWalletId: account1FirstWalletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    await transactionService.insert({
      FromWalletId: account2WalletCreditCard.id,
      ToWalletId: account2WalletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });

  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  it('Should not create a transaction because wallet does not have balance', async () => {
    try {
      const amountTransaction = 1500;
      const currencyTransaction = 'USD';
      await transactionService.insert({
        FromWalletId: account1SecondWalletUsd.id, // this account balance is 0 so should fail
        ToWalletId: account2WalletUsd.id,
        amount: amountTransaction,
        currency: currencyTransaction,
      });
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain('does not have enough balance to complete transaction');
    }
  }); /** End of "Should not create a transaction because wallet does not have balance" */

  it('Should create a transaction from a wallet that has enough balance', async () => {
    const fromWallet = account1FirstWalletUsd;
    const toWallet = account2WalletUsd;
    const currencyTransaction = 'USD';
    // check walletUsd Balance
    const fromWalletBalanceBeforeTransaction = await walletLib.getCurrencyBalanceFromWalletId(currencyTransaction, fromWallet.id);
    const toWalletBalanceBeforeTransaction = await walletLib.getCurrencyBalanceFromWalletId(currencyTransaction, toWallet.id);
    // set the amount of transaction to half of the fromWallet balance
    // making sure we are trying to execute a transaction that the fromWallet has balance
    const amountTransaction = Math.round(fromWalletBalanceBeforeTransaction/2);
    // setting amount of transaction as half of the FromWallet
    const transactionResult = await transactionService.insert({
      FromWalletId: fromWallet.id,
      ToWalletId: toWallet.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    // Should create 2 transactions(double entry DEBIT and CREDIT)
    expect(transactionResult).to.be.an('array');
    expect(transactionResult).to.have.lengthOf(2);  
    // making sure fromWallet was decreased and toWallet was increased
    const fromWalletBalanceAfterTransaction = await walletLib.getCurrencyBalanceFromWalletId(currencyTransaction, fromWallet.id);
    const toWalletBalanceAfterTransaction = await walletLib.getCurrencyBalanceFromWalletId(currencyTransaction, toWallet.id);
    expect(fromWalletBalanceAfterTransaction).to.be.equal(fromWalletBalanceBeforeTransaction - amountTransaction);
    expect(toWalletBalanceAfterTransaction).to.be.equal(toWalletBalanceBeforeTransaction + amountTransaction);
  }); /** End of "Should create a transaction from a wallet that has enough balance" */


});/** End of "TransactionAccountToAccount" */

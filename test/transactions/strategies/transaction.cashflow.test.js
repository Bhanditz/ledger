/**
 * Test around the @{TransactionCashFlow}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import AccountService from '../../../server/services/accountService';
import WalletService from '../../../server/services/walletService';
import TransactionService from '../../../server/services/transactionService';
import ResetDb from '../../resetDb';
import { paymentMethodServices } from '../../../server/globals/enums/paymentMethodServices';
import ProviderService from '../../../server/services/providerService';
import PlatformInfo from '../../../server/globals/platformInfo';
import WalletLib from '../../../server/lib/walletLib';

describe('TransactionCashFlow', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  const transactionService = new TransactionService();
  const providerService = new ProviderService();

  let regularAccount, walletUsd, walletCreditCard, accountProvider, provider, walletProvider;

  beforeEach(async () => {
    await ResetDb.run();
    // Creating Provider Account and its USD wallet
    // 1) Provider USD(currency USD)
    accountProvider = await accountService.insert({ slug: 'provider_usd' });
    provider = await providerService.insert({
      name: 'provider_USD',
      fixedFee: 0,
      percentFee: 0.05,
      service: paymentMethodServices.opencollective.name,
      type: paymentMethodServices.opencollective.types.COLLECTIVE,
      OwnerAccountId: accountProvider.id,
    });
    walletProvider = await walletService.insert({
      OwnerAccountId: accountProvider.id,
      currency: 'USD',
      name: 'provider_USD',
      ProviderId: null,
    });
    // Creates Account1 Account and its wallets
    regularAccount = await accountService.insert({ slug: 'regular-account' });
    // Creating USD Wallet of Regular Account
    walletUsd = await walletService.insert({
      OwnerAccountId: regularAccount.id,
      currency: 'USD',
      name: 'regular-account-USD',
      ProviderId: provider.id,
    });
    // Creating Credit Card Wallet of Regular Account
    walletCreditCard = await walletService.insert({
      OwnerAccountId: regularAccount.id,
      currency: 'USD',
      name: 'regular-account-CC-USD',
      ProviderId: provider.id,
    });
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  it('Regular Account cashes in from its creditcard wallet to its USD wallet(Without Platform Payment Provider Fees) Should generate 4 transactions(2 Regarding Wallet Provider fees and 2 regarding the transaction itself )', async () => {
    const amountTransaction = 1500;
    const currencyTransaction = 'USD';
    const cashinResult = await transactionService.insert({
      FromWalletId: walletCreditCard.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    expect(cashinResult).to.have.lengthOf(4);
    
    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];
    const providerDebitTransaction = cashinResult[2];
    const providerCreditTransaction = cashinResult[3];

    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);

    // Validating Provider Fees Transactions
    // Provider Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(providerDebitTransaction.FromAccountId).to.be.equal(accountProvider.id);
    expect(providerCreditTransaction.ToAccountId).to.be.equal(accountProvider.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(providerDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(providerCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // checking if amount of transactions is as expected
    const expectedFee = provider.fixedFee + (provider.percentFee * amountTransaction);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(providerDebitTransaction.amount).to.be.equal(-1 * expectedFee);
    expect(providerCreditTransaction.amount).to.be.equal(expectedFee);
    // currencies should be the same as original transaction
    expect(providerDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(providerCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Provider Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(providerDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
    expect(providerCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(providerDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(providerCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Checking Amounts
    // Checking transactionGroupTotalAmount
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(providerDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(providerCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // "Normal" transactions amount should be total-fees (negative in Debit transaction and the same but positive in Credit transaction)
    expect(normalCreditTransaction.amount).to.be.equal(amountTransaction - providerCreditTransaction.amount);
    expect(normalDebitTransaction.amount).to.be.equal(-1 *(amountTransaction - providerCreditTransaction.amount));
    // checking if total amount matches both amounts on credit transactions
    expect(normalCreditTransaction.amount + providerCreditTransaction.amount).to.be.equal(amountTransaction);

  }); /** End of "Regular Account cashes in from its creditcard wallet to its USD wallet(Without Platform Payment Provider Fees) Should generate 4 transactions(2 Regarding Wallet Provider fees and 2 regarding the transaction itself )" */ 

  it('Regular Account cashes in from One wallet to Another wallet With Platform Fees and No Payment provider Fee should generate 6 transactions(2 wallet provider, 2 platform fees and 2 regular transaction)', async () => {
    // defining total amount of transaction
    const amountTransaction = 1500;
    // defining Platform Fee
    const platformFee = 75;
    const currencyTransaction = 'USD';
    const cashinResult = await transactionService.insert({
      FromWalletId: walletCreditCard.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
      platformFee: platformFee,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    expect(cashinResult).to.have.lengthOf(6);
    
    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];
    const platformDebitTransaction = cashinResult[2];
    const platformCreditTransaction = cashinResult[3];
    const walletProviderDebitTransaction = cashinResult[4];
    const walletProviderCreditTransaction = cashinResult[5];
    
    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
    
    // Validating Platform Fees Transactions
    const platformAccount = await PlatformInfo.getAccount();
    const platformWallet = await PlatformInfo.getWallet();
    // Platform Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(platformDebitTransaction.FromAccountId).to.be.equal(platformAccount.id);
    expect(platformCreditTransaction.ToAccountId).to.be.equal(platformAccount.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(platformDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(platformCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(platformDebitTransaction.amount).to.be.equal(-1 * platformFee);
    expect(platformCreditTransaction.amount).to.be.equal(platformFee);
    // currencies should be the same as original transaction
    expect(platformDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(platformCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Platform Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(platformDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
    expect(platformCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(platformDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(platformCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Validating Provider Fees Transactions
    // Provider Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(walletProviderDebitTransaction.FromAccountId).to.be.equal(accountProvider.id);
    expect(walletProviderCreditTransaction.ToAccountId).to.be.equal(accountProvider.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(walletProviderDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(walletProviderCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // checking if amount of transactions is as expected
    const expectedFee = provider.fixedFee + (provider.percentFee * amountTransaction);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(walletProviderDebitTransaction.amount).to.be.equal(-1 * expectedFee);
    expect(walletProviderCreditTransaction.amount).to.be.equal(expectedFee);
    // currencies should be the same as original transaction
    expect(walletProviderDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(walletProviderCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Provider Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(walletProviderDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
    expect(walletProviderCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(walletProviderDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(walletProviderCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Checking Amounts
    // Checking transactionGroupTotalAmount
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(platformDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(platformCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // "Normal" transactions amount should be total-fees (negative in Debit transaction and the same but positive in Credit transaction)
    expect(normalCreditTransaction.amount).to.be.equal(amountTransaction - walletProviderCreditTransaction.amount - platformCreditTransaction.amount);
    expect(normalDebitTransaction.amount).to.be.equal(-1 *(amountTransaction - walletProviderCreditTransaction.amount - platformCreditTransaction.amount));
    // checking if total amount matches both amounts on credit transactions
    expect(normalCreditTransaction.amount + walletProviderCreditTransaction.amount + platformCreditTransaction.amount).to.be.equal(amountTransaction);
  }); /** End of "Regular Account cashes in from One wallet to Another wallet With Platform Fees and No Payment provider Fee should generate 6 transactions(2 wallet provider, 2 platform fees and 2 regular transaction)" */

  it('Regular Account cashes in from One wallet to Another wallet With Payment provider and No Platform Fee should generate 6 transactions(2 wallet provider, 2 payment provider fees and 2 regular transaction)', async () => {
    // Creates PaymentProvider Account
    const paymentProviderAccount = await accountService.insert({ slug: 'payment-provider' });
    // Creating USD Wallet of PaymentProvider
    const paymentProviderWallet = await walletService.insert({
      OwnerAccountId: paymentProviderAccount.id,
      currency: 'USD',
      name: 'paymentProvider-USD',
      ProviderId: null,
    });
    // defining total amount of transaction
    const amountTransaction = 1500;
    // defining Payment Provider Fee
    const paymentProviderFee = 75;
    const currencyTransaction = 'USD';
    const cashinResult = await transactionService.insert({
      FromWalletId: walletCreditCard.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
      paymentProviderFee: paymentProviderFee,
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    expect(cashinResult).to.have.lengthOf(6);
    
    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];
    const paymentProviderDebitTransaction = cashinResult[2];
    const paymentProviderCreditTransaction = cashinResult[3];
    const walletProviderDebitTransaction = cashinResult[4];
    const walletProviderCreditTransaction = cashinResult[5];
    
    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
    
    // Validating Payment Provider Fees Transactions
    // Platform Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(paymentProviderDebitTransaction.FromAccountId).to.be.equal(paymentProviderAccount.id);
    expect(paymentProviderCreditTransaction.ToAccountId).to.be.equal(paymentProviderAccount.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(paymentProviderDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(paymentProviderCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(paymentProviderDebitTransaction.amount).to.be.equal(-1 * paymentProviderFee);
    expect(paymentProviderCreditTransaction.amount).to.be.equal(paymentProviderFee);
    // currencies should be the same as original transaction
    expect(paymentProviderDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(paymentProviderCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Platform Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(paymentProviderDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
    expect(paymentProviderCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(paymentProviderDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(paymentProviderCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Validating Provider Fees Transactions
    // Provider Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(walletProviderDebitTransaction.FromAccountId).to.be.equal(accountProvider.id);
    expect(walletProviderCreditTransaction.ToAccountId).to.be.equal(accountProvider.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(walletProviderDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(walletProviderCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // checking if amount of transactions is as expected
    const expectedFee = provider.fixedFee + (provider.percentFee * amountTransaction);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(walletProviderDebitTransaction.amount).to.be.equal(-1 * expectedFee);
    expect(walletProviderCreditTransaction.amount).to.be.equal(expectedFee);
    // currencies should be the same as original transaction
    expect(walletProviderDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(walletProviderCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Provider Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(walletProviderDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
    expect(walletProviderCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(walletProviderDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(walletProviderCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Checking Amounts
    // Checking transactionGroupTotalAmount
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(paymentProviderDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(paymentProviderCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // "Normal" transactions amount should be total-fees (negative in Debit transaction and the same but positive in Credit transaction)
    expect(normalCreditTransaction.amount).to.be.equal(amountTransaction - walletProviderCreditTransaction.amount - paymentProviderCreditTransaction.amount);
    expect(normalDebitTransaction.amount).to.be.equal(-1 *(amountTransaction - walletProviderCreditTransaction.amount - paymentProviderCreditTransaction.amount));
    // checking if total amount matches both amounts on credit transactions
    expect(normalCreditTransaction.amount + walletProviderCreditTransaction.amount + paymentProviderCreditTransaction.amount).to.be.equal(amountTransaction);
  }); /** End of "Regular Account cashes in from One wallet to Another wallet With Payment provider and No Platform Fee should generate 6 transactions(2 wallet provider, 2 payment provider fees and 2 regular transaction)" */

  it('Regular Account cashes in from One wallet to Another wallet With Payment provider and No Platform Fee should generate 8 transactions(2 wallet provider, 2 platform fees, 2 payment provider fees and 2 regular transaction)', async () => {
    // Creates PaymentProvider Account
    const paymentProviderAccount = await accountService.insert({ slug: 'payment-provider' });
    // Creating USD Wallet of PaymentProvider
    const paymentProviderWallet = await walletService.insert({
      OwnerAccountId: paymentProviderAccount.id,
      currency: 'USD',
      name: 'paymentProvider-USD',
      ProviderId: null,
    });
    // defining total amount of transaction
    const amountTransaction = 1500;
    // defining Platform and Payment Provider Fees
    const paymentProviderFee = 75;
    const platformFee = 50;
    // defining currency of transaction
    const currencyTransaction = 'USD';
    const cashinResult = await transactionService.insert({
      FromWalletId: walletCreditCard.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
      platformFee: platformFee,
      paymentProviderFee: paymentProviderFee,
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    
    expect(cashinResult).to.have.lengthOf(8);

    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];
    const paymentProviderDebitTransaction = cashinResult[2];
    const paymentProviderCreditTransaction = cashinResult[3];
    const platformDebitTransaction = cashinResult[4];
    const platformCreditTransaction = cashinResult[5];
    const walletProviderDebitTransaction = cashinResult[6];
    const walletProviderCreditTransaction = cashinResult[7];
    
    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
    
    // Validating Platform Fees Transactions
    const platformAccount = await PlatformInfo.getAccount();
    const platformWallet = await PlatformInfo.getWallet();
    // Platform Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(platformDebitTransaction.FromAccountId).to.be.equal(platformAccount.id);
    expect(platformCreditTransaction.ToAccountId).to.be.equal(platformAccount.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(platformDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(platformCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(platformDebitTransaction.amount).to.be.equal(-1 * platformFee);
    expect(platformCreditTransaction.amount).to.be.equal(platformFee);
    // currencies should be the same as original transaction
    expect(platformDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(platformCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Platform Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(platformDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
    expect(platformCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(platformDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(platformCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Validating Payment Provider Fees Transactions
    // Platform Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(paymentProviderDebitTransaction.FromAccountId).to.be.equal(paymentProviderAccount.id);
    expect(paymentProviderCreditTransaction.ToAccountId).to.be.equal(paymentProviderAccount.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(paymentProviderDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(paymentProviderCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(paymentProviderDebitTransaction.amount).to.be.equal(-1 * paymentProviderFee);
    expect(paymentProviderCreditTransaction.amount).to.be.equal(paymentProviderFee);
    // currencies should be the same as original transaction
    expect(paymentProviderDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(paymentProviderCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Platform Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(paymentProviderDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
    expect(paymentProviderCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(paymentProviderDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(paymentProviderCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Validating Provider Fees Transactions
    // Provider Account should be FromAccountId on Debit and ToAccountId on Credit transactions
    expect(walletProviderDebitTransaction.FromAccountId).to.be.equal(accountProvider.id);
    expect(walletProviderCreditTransaction.ToAccountId).to.be.equal(accountProvider.id);
    // Regular Account should be ToAccountId on Debit and FromAccountId on Credit transactions
    expect(walletProviderDebitTransaction.ToAccountId).to.be.equal(regularAccount.id);
    expect(walletProviderCreditTransaction.FromAccountId).to.be.equal(regularAccount.id);
    // checking if amount of transactions is as expected
    const expectedFee = provider.fixedFee + (provider.percentFee * amountTransaction);
    // amount should be negative in Debit transaction and the same in Credit transaction
    expect(walletProviderDebitTransaction.amount).to.be.equal(-1 * expectedFee);
    expect(walletProviderCreditTransaction.amount).to.be.equal(expectedFee);
    // currencies should be the same as original transaction
    expect(walletProviderDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(walletProviderCreditTransaction.currency).to.be.equal(currencyTransaction);
    // Provider Wallet should be FromWalletId on Debit and ToWalletId on Credit transactions
    expect(walletProviderDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
    expect(walletProviderCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
    // Regular Account should have its original FromWalletId(walletCreditCard.id) present in the ToWalletId on Debit and FromWalletId on Credit transactions
    expect(walletProviderDebitTransaction.ToWalletId).to.be.equal(walletCreditCard.id);
    expect(walletProviderCreditTransaction.FromWalletId).to.be.equal(walletCreditCard.id);

    // Checking Amounts
    // Checking transactionGroupTotalAmount
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(paymentProviderDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(paymentProviderCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(platformDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(platformCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(walletProviderCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // "Normal" transactions amount should be total-fees (negative in Debit transaction and the same but positive in Credit transaction)
    const totalNetAmount =  amountTransaction - walletProviderCreditTransaction.amount - paymentProviderCreditTransaction.amount - platformCreditTransaction.amount;
    expect(normalCreditTransaction.amount).to.be.equal(totalNetAmount);
    expect(normalDebitTransaction.amount).to.be.equal(-1 *totalNetAmount);
    // checking if total amount matches both amounts on credit transactions
    expect(normalCreditTransaction.amount + walletProviderCreditTransaction.amount +
            paymentProviderCreditTransaction.amount + platformCreditTransaction.amount)
      .to.be.equal(amountTransaction);
  }); /** End of "Regular Account cashes in from One wallet to Another wallet With Payment provider and No Platform Fee should generate 8 transactions(2 wallet provider, 2 platform fees, 2 payment provider fees and 2 regular transaction)" */

  it('Regular Account cashes in from One wallet to Another wallet When the Wallet Provider has 0 fee so should generate only 2 transactions', async () => {
    // Creates zero fee Provider(its account and the provider itself)
    const zeroFeeAccountProvider = await accountService.insert({ slug: 'zero_feeprovider_usd' });
    const zeroFeeProvider = await providerService.insert({
      name: 'zero_fee_provider_USD',
      fixedFee: 0,
      percentFee: 0,
      service: paymentMethodServices.opencollective.name,
      type: paymentMethodServices.opencollective.types.COLLECTIVE,
      OwnerAccountId: zeroFeeAccountProvider.id,
    });
    // Creates another wallet for the regularAccount using the zeroFeeProvider
    const regularAccountNoFeeProviderWallet = await walletService.insert({
      OwnerAccountId: regularAccount.id,
      currency: 'USD',
      name: 'regular-account-CC-USD',
      ProviderId: zeroFeeProvider.id,
    });

    const amountTransaction = 1500;
    const currencyTransaction = 'USD';
    const cashinResult = await transactionService.insert({
      FromWalletId: regularAccountNoFeeProviderWallet.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    // check if initial Cashin transaction generates 2 transactions(normal DEBIT AND CREDIT transactions)
    expect(cashinResult).to.be.an('array');
    expect(cashinResult).to.have.lengthOf(2);
    
    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];

    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);

    // gross amounts(field transactionGroupTotalAmount) should be the same of the "original" transaction
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // gross amount(field transactionGroupTotalAmount) should be the same as net amounts(field amount) because there is no fees
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(normalCreditTransaction.amount);
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(-1 * normalDebitTransaction.amount);

  }); /** End of "Regular Account cashes in from One wallet to Another wallet When the Wallet Provider has 0 fee so should generate only 2 transactions" */

  it('Regular Account cashes in from its USD Wallet to its Credit Card wallet Should pay no fees because the money is already in its USD Account(Should only pay Wallet provider Fee if wallet has no balance)', async () => {
    // first sends money from Credit Card Wallet to USD Wallet
    let amountTransaction = 1500;
    const currencyTransaction = 'USD';
    let cashinResult = await transactionService.insert({
      FromWalletId: walletCreditCard.id,
      ToWalletId: walletUsd.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    expect(cashinResult).to.have.lengthOf(4);
    // get credit transaction to get net amount of transaction
    const creditTransaction = cashinResult[1];
    // check walletUsd Balance
    const walletLib = new WalletLib();
    const walletUsdBalance = await walletLib.getCurrencyBalanceFromWalletId(currencyTransaction, walletUsd.id);
    expect(walletUsdBalance).to.be.equal(creditTransaction.amount);
    
    // Then creates another transaction with an amount lower then walletUsdBalance
    amountTransaction = walletUsdBalance - Math.round(walletUsdBalance/2);
    cashinResult = await transactionService.insert({
      FromWalletId: walletUsd.id,
      ToWalletId: walletCreditCard.id,
      amount: amountTransaction,
      currency: currencyTransaction,
    });
    // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
    expect(cashinResult).to.be.an('array');
    
    expect(cashinResult).to.have.lengthOf(2);
    // Get all generated Transactions
    const normalDebitTransaction = cashinResult[0];
    const normalCreditTransaction = cashinResult[1];

    // Validating "Normal Transactions"
    // FromAccountID and ToAccountId should be the same in both transactions
    expect(normalDebitTransaction.FromAccountId).to.be.equal(normalDebitTransaction.ToAccountId);
    expect(normalCreditTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
    // currencies should be the same as original transaction
    expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
    expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
    // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
    expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
    expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);

    // gross amounts(field transactionGroupTotalAmount) should be the same of the "original" transaction
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    // gross amount(field transactionGroupTotalAmount) should be the same as net amounts(field amount) because there is no fees
    expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(normalCreditTransaction.amount);
    expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(-1 * normalDebitTransaction.amount);
  }); /** End of "Regular Account cashes in from its USD Wallet to its Credit Card wallet Should pay no fees because the money is already in its USD Account(Should only pay Wallet provider Fee if wallet has no balance)" */

}); /** End of "TransactionCashflow" */

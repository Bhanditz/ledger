/**
 * Test around the @{TransactionRegularStrategy}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import AccountService from '../../../server/services/accountService';
import WalletService from '../../../server/services/walletService';
import TransactionService from '../../../server/services/transactionService';
import ResetDb from '../../resetDb';
import paymentMethodServices from '../../../server/globals/enums/paymentMethodServices';
import ProviderService from '../../../server/services/providerService';

describe('TransactionRegularStrategy Account to Account transactions', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  const transactionService = new TransactionService();
  const providerService = new ProviderService();

  let account1, account2, walletUsdAccount1, walletUsdAccount2, accountProvider, provider, walletProvider;

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
    // Creates Accounts
    account1 = await accountService.insert({ slug: 'account1' });
    account2 = await accountService.insert({ slug: 'account2' });
    // Creating Wallets
    walletUsdAccount1 = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'USD',
      name: 'account1-USD',
      ProviderId: provider.id,
    });
    walletUsdAccount2 = await walletService.insert({
      OwnerAccountId: account2.id,
      currency: 'USD',
      name: 'account2-USD',
      ProviderId: provider.id,
    });
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  describe('Receiver Paying Fees(default behaviour)', () => {

    it('account1(USD Wallet) sends 15USD to account 2\'s(USD Wallet)', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const amountTransaction = 1500;
      const currencyTransaction = 'USD';
      const walletProviderFee = 100;
      const cashinResult = await transactionService.insert({
        FromWalletId: walletUsdAccount1.id,
        ToWalletId: walletUsdAccount2.id,
        amount: amountTransaction,
        currency: currencyTransaction,
        walletProviderFee: walletProviderFee,
      });
      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const walletProviderFeeDebitTransaction = cashinResult[2];
      const walletProviderFeeCreditTransaction = cashinResult[3];

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // account1 id and walletId should be ToAccountId and ToWalletId in DEBIT transaction and FromAccountId in CREDIT txs
      expect(normalDebitTransaction.ToAccountId).to.be.equal(account1.id);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(walletUsdAccount1.id);
      expect(normalCreditTransaction.FromAccountId).to.be.equal(account1.id);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(walletUsdAccount1.id);
      // account2 id and walletId should be FromAccountId and FromWalletId in DEBIT transaction and ToAccountId in CREDIT txs
      expect(normalDebitTransaction.FromAccountId).to.be.equal(account2.id);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(walletUsdAccount2.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(account2.id);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(walletUsdAccount2.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
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

      // Validating Wallet Provider Fee Transaction
      // account1 id and walletId should be ToAccountId and ToWalletId in DEBIT transaction and FromAccountId in CREDIT txs
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(account2.id);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(walletUsdAccount2.id);
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(account2.id);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletUsdAccount2.id);
      // account2 id and walletId should be FromAccountId and FromWalletId in DEBIT transaction and ToAccountId in CREDIT txs
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProvider.OwnerAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(walletProvider.OwnerAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeDebitTransaction.currency).to.be.equal(currencyTransaction);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(currencyTransaction);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // gross amounts(field transactionGroupTotalAmount) should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * walletProviderFee);
      // gross amount(field transactionGroupTotalAmount) should be the same as net amounts(field amount) because there is no fees
      expect(walletProviderFeeCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
      expect(walletProviderFeeDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    }); /** End of "account1 cashes in 15USD from its USD Wallet and send to account 2\'s USD Wallet" */
  });

  describe('Sender Paying Fees', () => {

    it('account1(USD Wallet) sends 15USD to account 2\'s(USD Wallet)', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const amountTransaction = 1500;
      const currencyTransaction = 'USD';
      const walletProviderFee = 100;
      const cashinResult = await transactionService.insert({
        FromWalletId: walletUsdAccount1.id,
        ToWalletId: walletUsdAccount2.id,
        amount: amountTransaction,
        currency: currencyTransaction,
        walletProviderFee: walletProviderFee,
        senderPayFees: true,
      });
      console.log(`walletUsdAccount1: ${JSON.stringify(walletUsdAccount1, null,2)}`);
      console.log(`walletUsdAccount2: ${JSON.stringify(walletUsdAccount2, null,2)}`);
      console.log(`${JSON.stringify(cashinResult, null,2)}`);
      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const walletProviderFeeDebitTransaction = cashinResult[2];
      const walletProviderFeeCreditTransaction = cashinResult[3];

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // account1 id and walletId should be ToAccountId and ToWalletId in DEBIT transaction and FromAccountId in CREDIT txs
      expect(normalDebitTransaction.ToAccountId).to.be.equal(account1.id);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(walletUsdAccount1.id);
      expect(normalCreditTransaction.FromAccountId).to.be.equal(account1.id);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(walletUsdAccount1.id);
      // account2 id and walletId should be FromAccountId and FromWalletId in DEBIT transaction and ToAccountId in CREDIT txs
      expect(normalDebitTransaction.FromAccountId).to.be.equal(account2.id);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(walletUsdAccount2.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(account2.id);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(walletUsdAccount2.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(currencyTransaction);
      expect(normalCreditTransaction.currency).to.be.equal(currencyTransaction);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // gross amounts(field transactionGroupTotalAmount) should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(amountTransaction - walletProviderFee);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * (amountTransaction - walletProviderFee));
      // gross amount(field transactionGroupTotalAmount) should be the same as net amounts(field amount) because there is no fees
      expect(normalCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
      expect(normalDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);

      // Validating Wallet Provider Fee Transaction
      // account1 id and walletId should be ToAccountId and ToWalletId in DEBIT transaction and FromAccountId in CREDIT txs
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(account1.id);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(walletUsdAccount1.id);
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(account1.id);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletUsdAccount1.id);
      // account2 id and walletId should be FromAccountId and FromWalletId in DEBIT transaction and ToAccountId in CREDIT txs
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProvider.OwnerAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProvider.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(walletProvider.OwnerAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProvider.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeDebitTransaction.currency).to.be.equal(currencyTransaction);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(currencyTransaction);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // gross amounts(field transactionGroupTotalAmount) should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * walletProviderFee);
      // gross amount(field transactionGroupTotalAmount) should be the same as net amounts(field amount) because there is no fees
      expect(walletProviderFeeCreditTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
      expect(walletProviderFeeDebitTransaction.transactionGroupTotalAmount).to.be.equal(amountTransaction);
    }); /** End of "account1 cashes in 15USD from its USD Wallet and send to account 2\'s USD Wallet" */
  });
}); /** End of "TransactionRegularStrategy Account to Account transactions" */

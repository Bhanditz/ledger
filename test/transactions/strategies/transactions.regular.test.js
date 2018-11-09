/**
 * Test around the @{Account to Account(same currency) transactions}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import WalletService from '../../../server/services/walletService';
import TransactionService from '../../../server/services/transactionService';
import ResetDb from '../../resetDb';

describe('Account to Account(same currency) transactions', () => {
  const walletService = new WalletService();
  const transactionService = new TransactionService();

  beforeEach(async () => {
    await ResetDb.run();
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  describe('Receiver Paying Fees(default behaviour)', () => {
    it('bob sends 15USD to alice, only wallet provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const transaction = {
        FromAccountId: 'bob',
        fromWallet: { name: 'bobUSDWallet', currency: 'USD', AccountId: 'bob', OwnerAccountId: 'bob' },
        ToAccountId: 'alice',
        toWallet: { name: 'aliceUSDWallet', currency: 'USD', AccountId: 'alice', OwnerAccountId: 'opencollectiveHost' },
        amount: 1500,
        currency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId: 'opencollectiveHost',
        walletProviderWallet: { name: 'opencollectiveHostWallet', AccountId: 'opencollectiveHost', OwnerAccountId: 'opencollectiveHost' },
      };
      const cashinResult = await transactionService.insert(transaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const walletProviderFeeDebitTransaction = cashinResult[2];
      const walletProviderFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.amount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.amount);

      // Validating Wallet Provider Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15USD to alice, only wallet provider fee" */

    it('bob sends 15USD to alice, only payment provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const transaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobUSDWallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'bob',
        },
        ToAccountId: 'alice',
        toWallet: {
          name: 'aliceUSDWallet',
          currency: 'USD',
          AccountId: 'alice',
          OwnerAccountId: 'opencollectiveHost',
        },
        amount: 1500,
        currency: 'USD',
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
      };
      const cashinResult = await transactionService.insert(transaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const paymentProviderFeeDebitTransaction = cashinResult[2];
      const paymentProviderFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.amount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.amount);

      // Validating Payment Provider Fee Transaction
      // alice should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

    }); /** End of "bob sends 15USD to alice, only payment provider fee" */

    it('bob sends 15USD to alice, only platform fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const transaction = {
        FromAccountId: 'bob',
        fromWallet: { name: 'bobUSDWallet', currency: 'USD', AccountId: 'bob', OwnerAccountId: 'bob' },
        ToAccountId: 'alice',
        toWallet: { name: 'aliceUSDWallet', currency: 'USD', AccountId: 'alice', OwnerAccountId: 'opencollectiveHost' },
        amount: 1500,
        currency: 'USD',
        platformFee: 200,
      };
      const cashinResult = await transactionService.insert(transaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const platformFeeDebitTransaction = cashinResult[2];
      const platformFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      // the platform wallet will always be named with the 'platform' string
      const platformWallet = await walletService.getOne({ name: 'platform' });
      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.amount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.amount);

      // Validating Platform Fee Transaction
      // alice should be set in the "To" fields, platform should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // platform should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformFeeCreditTransaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(platformFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformFeeCreditTransaction.ToWalletId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(platformFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(platformFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(platformFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

    }); /** End of "bob sends 15USD to alice, only platform fee" */

    it('bob sends 15USD to alice, all fees', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const transaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobUSDWallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'bob',
        },
        ToAccountId: 'alice',
        toWallet: {
          name: 'aliceUSDWallet',
          currency: 'USD',
          AccountId: 'alice',
          OwnerAccountId: 'opencollectiveHost',
        },
        amount: 1500,
        currency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId: 'opencollectiveHost',
        walletProviderWallet: {
          name: 'opencollectiveHostWallet',
          AccountId: 'opencollectiveHost',
          OwnerAccountId: 'opencollectiveHost',
        },
        platformFee: 200,
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
      };
      const cashinResult = await transactionService.insert(transaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const paymentProviderFeeDebitTransaction = cashinResult[2];
      const paymentProviderFeeCreditTransaction = cashinResult[3];
      const platformFeeDebitTransaction = cashinResult[4];
      const platformFeeCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      // the platform wallet will always be named with the 'platform' string
      const platformWallet = await walletService.getOne({ name: 'platform' });

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.amount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.amount);

      // Validating Payment Provider Fee Transaction
      // alice should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

      // Validating Platform Fee Transaction
      // alice should be set in the "To" fields, platform should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // platform should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformFeeCreditTransaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(platformFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformFeeCreditTransaction.ToWalletId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(platformFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(platformFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(platformFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

      // Validating Wallet Provider Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15USD to alice, only platform fee" */
  });

  describe('Sender Paying Fees', () => {
    it('bob sends 15USD to alice, only wallet provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: { name: 'bobUSDWallet', currency: 'USD', AccountId: 'bob', OwnerAccountId: 'bob' },
        ToAccountId: 'alice',
        toWallet: { name: 'aliceUSDWallet', currency: 'USD', AccountId: 'alice', OwnerAccountId: 'opencollectiveHost' },
        amount: 1500,
        currency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId: 'opencollectiveHost',
        walletProviderWallet: { name: 'opencollectiveHostWallet', AccountId: 'opencollectiveHost', OwnerAccountId: 'opencollectiveHost' },
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const walletProviderFeeDebitTransaction = cashinResult[2];
      const walletProviderFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      // setting netAmount of Account to Account transaction
      const netAmount = transaction.amount - transaction.walletProviderFee;
      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Wallet Provider Fee Transaction
      // bob should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15USD to alice, only wallet provider fee" */

    it('bob sends 15USD to alice, only payment provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobUSDWallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'bob',
        },
        ToAccountId: 'alice',
        toWallet: {
          name: 'aliceUSDWallet',
          currency: 'USD',
          AccountId: 'alice',
          OwnerAccountId: 'opencollectiveHost',
        },
        amount: 1500,
        currency: 'USD',
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const paymentProviderFeeDebitTransaction = cashinResult[2];
      const paymentProviderFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      // setting netAmount of Account to Account transaction
      const netAmount = transaction.amount - transaction.paymentProviderFee;

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Payment Provider Fee Transaction
      // bob should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

    }); /** End of "bob sends 15USD to alice, only payment provider fee" */

    it('bob sends 15USD to alice, only platform fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: { name: 'bobUSDWallet', currency: 'USD', AccountId: 'bob', OwnerAccountId: 'bob' },
        ToAccountId: 'alice',
        toWallet: { name: 'aliceUSDWallet', currency: 'USD', AccountId: 'alice', OwnerAccountId: 'opencollectiveHost' },
        amount: 1500,
        currency: 'USD',
        platformFee: 200,
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(4);

      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const platformFeeDebitTransaction = cashinResult[2];
      const platformFeeCreditTransaction = cashinResult[3];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      // the platform wallet will always be named with the 'platform' string
      const platformWallet = await walletService.getOne({ name: 'platform' });
      // setting netAmount of Account to Account transaction
      const netAmount = transaction.amount - transaction.platformFee;

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Platform Fee Transaction
      // bob should be set in the "To" fields, platform should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // platform should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(platformFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformFeeCreditTransaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(platformFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformFeeCreditTransaction.ToWalletId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(platformFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(platformFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(platformFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

    }); /** End of "bob sends 15USD to alice, only platform fee" */

    it('bob sends 15USD to alice, all fees', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobUSDWallet',
          currency: 'USD',
          AccountId: 'bob',
          OwnerAccountId: 'bob',
        },
        ToAccountId: 'alice',
        toWallet: {
          name: 'aliceUSDWallet',
          currency: 'USD',
          AccountId: 'alice',
          OwnerAccountId: 'opencollectiveHost',
        },
        amount: 1500,
        currency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId: 'opencollectiveHost',
        walletProviderWallet: {
          name: 'opencollectiveHostWallet',
          AccountId: 'opencollectiveHost',
          OwnerAccountId: 'opencollectiveHost',
        },
        platformFee: 200,
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 4 transactions(normal and wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      // Get all generated Transactions
      const normalDebitTransaction = cashinResult[0];
      const normalCreditTransaction = cashinResult[1];
      const paymentProviderFeeDebitTransaction = cashinResult[2];
      const paymentProviderFeeCreditTransaction = cashinResult[3];
      const platformFeeDebitTransaction = cashinResult[4];
      const platformFeeCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      // the platform wallet will always be named with the 'platform' string
      const platformWallet = await walletService.getOne({ name: 'platform' });
      // setting netAmount of Account to Account transaction
      const netAmount = transaction.amount - transaction.walletProviderFee - transaction.platformFee - transaction.paymentProviderFee;

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.currency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Payment Provider Fee Transaction
      // bob should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

      // Validating Platform Fee Transaction
      // bob should be set in the "To" fields, platform should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // platform should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(platformFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformFeeCreditTransaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(platformFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformFeeCreditTransaction.ToWalletId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(platformFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(platformFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(platformFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

      // Validating Wallet Provider Fee Transaction
      // bob should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15USD to alice, only platform fee" */
  });
}); /** End of "Account to Account(same currency) transactions" */

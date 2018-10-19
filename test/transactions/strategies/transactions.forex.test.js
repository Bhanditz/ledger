/**
 * Test around the @{Forex transactions}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import WalletService from '../../../server/services/walletService';
import TransactionService from '../../../server/services/transactionService';
import ResetDb from '../../resetDb';
import WalletLib from '../../../server/lib/walletLib';

describe('Forex transactions', () => {
  const walletService = new WalletService();
  const walletLib = new WalletLib();
  const transactionService = new TransactionService();

  beforeEach(async () => {
    await ResetDb.run();
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  describe('required fields', () => {
    it('cannot create forex transactions without the paymentProvider wallet', async () => {
      try {
        await transactionService.insert({
            FromAccountId: 'bob',
            FromWalletName: 'bobUsdWallet',
            ToAccountId:  'alice',
            ToWalletName: 'aliceUsdWallet',
            amount: 1500,
            currency: 'EUR',
            destinationAmount: 2000, // The amount to be received(same currency as defined in the "destinationCurrency" field)
            destinationCurrency: 'USD', // The currency to be received
            walletProviderFee: 100,
            WalletProviderAccountId:  'opencollectiveHost',
            WalletProviderWalletName: 'opencollectiveHostWallet',
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('PaymentProviderWalletName field missing');
      }
    }); /** End of "cannot create forex transactions without the paymentProvider wallet" */

    it('cannot create forex transactions without the paymentProvider account', async () => {
      try {
        await transactionService.insert({
            FromAccountId: 'bob',
            FromWalletName: 'bobUsdWallet',
            ToAccountId:  'alice',
            ToWalletName: 'aliceUsdWallet',
            amount: 1500,
            currency: 'EUR',
            destinationAmount: 2000, // The amount to be received(same currency as defined in the "destinationCurrency" field)
            destinationCurrency: 'USD', // The currency to be received
            walletProviderFee: 100,
            WalletProviderAccountId:  'opencollectiveHost',
            WalletProviderWalletName: 'opencollectiveHostWallet',
            PaymentProviderWalletName: 'stripeWallet',
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('PaymentProviderAccountId field missing');
      }
    }); /** End of "cannot create forex transactions without the paymentProvider account" */
  });

  describe('Receiver Paying Fees(default behaviour)', () => {
    it('bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId:  'opencollectiveHost',
        WalletProviderWalletName: 'opencollectiveHostWallet',
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const walletProviderWallet = await walletService.getOne({ name: transaction.WalletProviderWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);
      
      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

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
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only payment provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        paymentProviderFee: 100,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const paymentProviderFeeDebitTransaction = cashinResult[6];
      const paymentProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Payment Provider Fee Transaction
      // alice should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal( paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only payment provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only platform fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        platformFee: 100,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const platformWallet = await walletService.getOne({ name: 'platform' });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Platform Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only platform fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, all fees', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId:  'opencollectiveHost',
        WalletProviderWalletName: 'opencollectiveHostWallet',
        platformFee: 200,
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(12);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const paymentProviderFeeDebitTransaction = cashinResult[6];
      const paymentProviderFeeCreditTransaction = cashinResult[7];
      const platformFeeDebitTransaction = cashinResult[8];
      const platformFeeCreditTransaction = cashinResult[9];
      const walletProviderFeeDebitTransaction = cashinResult[10];
      const walletProviderFeeCreditTransaction = cashinResult[11];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const platformWallet = await walletService.getOne({ name: 'platform' });
      const walletProviderWallet = await walletService.getOne({ name: transaction.WalletProviderWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

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
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
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
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
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
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, all fees" */
  });

  describe('Sender Paying Fees', () => {
    it('bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId:  'opencollectiveHost',
        WalletProviderWalletName: 'opencollectiveHostWallet',
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const walletProviderWallet = await walletService.getOne({ name: transaction.WalletProviderWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });
      // finding net Amount from bob to alice
      const netAmount = transaction.destinationAmount - transaction.walletProviderFee;
      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Wallet Provider Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only payment provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        paymentProviderFee: 100,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const paymentProviderFeeDebitTransaction = cashinResult[6];
      const paymentProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });
      // finding net Amount from bob to alice
      const netAmount = transaction.destinationAmount - transaction.paymentProviderFee;
      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Payment Provider Fee Transaction
      // alice should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal( paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only payment provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only platform fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        platformFee: 100,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const walletProviderFeeDebitTransaction = cashinResult[6];
      const walletProviderFeeCreditTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const platformWallet = await walletService.getOne({ name: 'platform' });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });

      // finding net Amount from bob to alice
      const netAmount = transaction.destinationAmount - transaction.platformFee;

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Platform Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only platform fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, all fees', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction =  {
        FromAccountId: 'bob',
        FromWalletName: 'bobUsdWallet',
        ToAccountId:  'alice',
        ToWalletName: 'aliceUsdWallet',
        amount: 1500,
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId:  'opencollectiveHost',
        WalletProviderWalletName: 'opencollectiveHostWallet',
        platformFee: 200,
        paymentProviderFee: 300,
        PaymentProviderAccountId: 'stripe',
        PaymentProviderWalletName: 'stripeWallet',
        senderPayFees: true,
      };
      const transaction = { ...originalTransaction }
      const cashinResult = await transactionService.insert(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(12);
      
      // Get all generated Transactions
      const conversionDebitPPToAccTransaction = cashinResult[0];
      const conversionCreditPPToAccTransaction = cashinResult[1];
      const conversionDebitAcctoPPTransaction  = cashinResult[2];
      const conversionCreditAcctoPPTransaction = cashinResult[3];

      const normalDebitTransaction = cashinResult[4];
      const normalCreditTransaction = cashinResult[5];
      const paymentProviderFeeDebitTransaction = cashinResult[6];
      const paymentProviderFeeCreditTransaction = cashinResult[7];
      const platformFeeDebitTransaction = cashinResult[8];
      const platformFeeCreditTransaction = cashinResult[9];
      const walletProviderFeeDebitTransaction = cashinResult[10];
      const walletProviderFeeCreditTransaction = cashinResult[11];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.FromWalletName });
      const fromAccountUsdTemporaryWallet = await walletLib.findOrCreateTemporaryCurrencyWallet('USD', transaction.FromAccountId);
      const toAccountWallet = await walletService.getOne({ name: transaction.ToWalletName });
      const platformWallet = await walletService.getOne({ name: 'platform' });
      const walletProviderWallet = await walletService.getOne({ name: transaction.WalletProviderWalletName });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.PaymentProviderWalletName });
      // finding net Amount from bob to alice
      const netAmount = transaction.destinationAmount - transaction.walletProviderFee - transaction.platformFee - transaction.paymentProviderFee;

      // Validating Conversion transactions(DEBIT and CREDIT)
      // Conversion: from Bob(EUR wallet) to Stripe
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitPPToAccTransaction.ToWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditPPToAccTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(conversionCreditPPToAccTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditPPToAccTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitPPToAccTransaction.FromAccountId).to.be.equal(conversionCreditPPToAccTransaction.ToAccountId);
      expect(conversionDebitPPToAccTransaction.ToAccountId).to.be.equal(conversionCreditPPToAccTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitPPToAccTransaction.currency).to.be.equal(transaction.currency);
      expect(conversionCreditPPToAccTransaction.currency).to.be.equal(transaction.currency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitPPToAccTransaction.FromWalletId).to.be.equal(conversionCreditPPToAccTransaction.ToWalletId);
      expect(conversionCreditPPToAccTransaction.FromWalletId).to.be.equal(conversionDebitPPToAccTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditPPToAccTransaction.amount).to.be.equal(transaction.amount);
      expect(conversionDebitPPToAccTransaction.amount).to.be.equal(-1 * transaction.amount);
      // Conversion: from Stripe(USD) to Bob's USD temporary Wallet
      // stripe should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionDebitAcctoPPTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // bob should be set in the "To" fields, stripe should be set in the "From" fields, in DEBIT transactions
      expect(conversionCreditAcctoPPTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(conversionCreditAcctoPPTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(conversionCreditAcctoPPTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(conversionDebitAcctoPPTransaction.FromAccountId).to.be.equal(conversionCreditAcctoPPTransaction.ToAccountId);
      expect(conversionDebitAcctoPPTransaction.ToAccountId).to.be.equal(conversionCreditAcctoPPTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(conversionDebitAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(conversionCreditAcctoPPTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(conversionDebitAcctoPPTransaction.FromWalletId).to.be.equal(conversionCreditAcctoPPTransaction.ToWalletId);
      expect(conversionCreditAcctoPPTransaction.FromWalletId).to.be.equal(conversionDebitAcctoPPTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(conversionCreditAcctoPPTransaction.amount).to.be.equal(transaction.destinationAmount);
      expect(conversionDebitAcctoPPTransaction.amount).to.be.equal(-1 * transaction.destinationAmount);

      // Validating Account to Account transaction(DEBIT and CREDIT)
      // bob should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(normalDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalDebitTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalDebitTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      // alice should be set in the "To" fields, bob should be set in the "From" fields, in DEBIT transactions
      expect(normalCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(normalCreditTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(normalCreditTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(normalDebitTransaction.FromAccountId).to.be.equal(normalCreditTransaction.ToAccountId);
      expect(normalDebitTransaction.ToAccountId).to.be.equal(normalCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(normalDebitTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(normalCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(normalDebitTransaction.FromWalletId).to.be.equal(normalCreditTransaction.ToWalletId);
      expect(normalCreditTransaction.FromWalletId).to.be.equal(normalDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(normalCreditTransaction.amount).to.be.equal(netAmount);
      expect(normalDebitTransaction.amount).to.be.equal(-1 * netAmount);

      // Validating Payment Provider Fee Transaction
      // alice should be set in the "To" fields, payment Provider should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      // payment Provider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(paymentProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(paymentProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeCreditTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(paymentProviderFeeDebitTransaction.FromAccountId).to.be.equal(paymentProviderFeeCreditTransaction.ToAccountId);
      expect(paymentProviderFeeDebitTransaction.ToAccountId).to.be.equal(paymentProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(paymentProviderFeeDebitTransaction.FromWalletId).to.be.equal(paymentProviderFeeCreditTransaction.ToWalletId);
      expect(paymentProviderFeeCreditTransaction.FromWalletId).to.be.equal(paymentProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(paymentProviderFeeCreditTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      expect(paymentProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.paymentProviderFee);

      // Validating Platform Fee Transaction
      // alice should be set in the "To" fields, platform should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformWallet.id);
      // platform should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(platformFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(platformFeeCreditTransaction.ToAccountId).to.be.equal(platformWallet.OwnerAccountId);
      expect(platformFeeCreditTransaction.ToWalletId).to.be.equal(platformWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(platformFeeDebitTransaction.FromAccountId).to.be.equal(platformFeeCreditTransaction.ToAccountId);
      expect(platformFeeDebitTransaction.ToAccountId).to.be.equal(platformFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(platformFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(platformFeeDebitTransaction.FromWalletId).to.be.equal(platformFeeCreditTransaction.ToWalletId);
      expect(platformFeeCreditTransaction.FromWalletId).to.be.equal(platformFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(platformFeeCreditTransaction.amount).to.be.equal(transaction.platformFee);
      expect(platformFeeDebitTransaction.amount).to.be.equal(-1 * transaction.platformFee);

      // Validating Wallet Provider Fee Transaction
      // alice should be set in the "To" fields, wallet Provider should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeDebitTransaction.ToWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderWallet.id);
      // walletProvider should be set in the "To" fields, alice should be set in the "From" fields, in DEBIT transactions
      expect(walletProviderFeeCreditTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(fromAccountUsdTemporaryWallet.id);
      expect(walletProviderFeeCreditTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeCreditTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      // FromAccountID and ToAccountId should be the same in both transactions
      expect(walletProviderFeeDebitTransaction.FromAccountId).to.be.equal(walletProviderFeeCreditTransaction.ToAccountId);
      expect(walletProviderFeeDebitTransaction.ToAccountId).to.be.equal(walletProviderFeeCreditTransaction.FromAccountId);
      // currencies should be the same as original transaction
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeCreditTransaction.currency).to.be.equal(transaction.destinationCurrency);
      // FromWalletId and ToWalletId should be opposite in Debit and Credit transactions
      expect(walletProviderFeeDebitTransaction.FromWalletId).to.be.equal(walletProviderFeeCreditTransaction.ToWalletId);
      expect(walletProviderFeeCreditTransaction.FromWalletId).to.be.equal(walletProviderFeeDebitTransaction.ToWalletId);
      // amount should be the same of the "original" transaction
      expect(walletProviderFeeCreditTransaction.amount).to.be.equal(transaction.walletProviderFee);
      expect(walletProviderFeeDebitTransaction.amount).to.be.equal(-1 * transaction.walletProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, all fees" */
  });
}); /** End of "Forex transactions" */

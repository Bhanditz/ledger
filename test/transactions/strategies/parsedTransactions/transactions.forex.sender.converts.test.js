/**
 * Test around the @{Forex transactions}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import WalletService from '../../../../server/services/walletService';
import TransactionService from '../../../../server/services/transactionService';
import ResetDb from '../../../resetDb';

describe('Forex transactions', () => {
  const walletService = new WalletService();
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
        await transactionService.insertParsedTransaction({
          FromAccountId: 'bob',
          fromWallet: {
            name: 'bobEURWallet', currency: 'EUR', AccountId: 'bob', OwnerAccountId: 'bob',
          },
          ToAccountId: 'alice',
          toWallet: {
            name: 'aliceUSDWallet',
            currency: 'USD',
            AccountId: 'alice',
            OwnerAccountId: 'opencollectiveHost',
          },
          amount: 1500,
          currency: 'EUR',
          destinationAmount: 2000, // The amount to be received(same currency as defined in the "destinationCurrency" field)
          destinationCurrency: 'USD', // The currency to be received
          walletProviderFee: 100,
          WalletProviderAccountId: 'opencollectiveHost',
          walletProviderWallet: {
            name: 'opencollectiveHostWallet',
            AccountId: 'opencollectiveHost',
            OwnerAccountId: 'opencollectiveHost',
          },
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('field paymentProviderWallet missing');
      }
    }); /** End of "cannot create forex transactions without the paymentProvider wallet" */

    it('cannot create forex transactions without the paymentProvider account', async () => {
      try {
        await transactionService.insertParsedTransaction({
          FromAccountId: 'bob',
          fromWallet: {
            name: 'bobEURWallet', currency: 'EUR', AccountId: 'bob', OwnerAccountId: 'bob',
          },
          ToAccountId: 'alice',
          toWallet: {
            name: 'aliceUSDWallet',
            currency: 'USD',
            AccountId: 'alice',
            OwnerAccountId: 'opencollectiveHost',
          },
          amount: 1500,
          currency: 'EUR',
          destinationAmount: 2000, // The amount to be received(same currency as defined in the "destinationCurrency" field)
          destinationCurrency: 'USD', // The currency to be received
          walletProviderFee: 100,
          WalletProviderAccountId: 'opencollectiveHost',
          walletProviderWallet: {
            name: 'opencollectiveHostWallet',
            AccountId: 'opencollectiveHost',
            OwnerAccountId: 'opencollectiveHost',
          },
          paymentProviderWallet: {
            name: 'stripeWallet',
            AccountId: 'stripe',
            OwnerAccountId: 'stripe',
          },
        });
      } catch (error) {
        expect(error).to.exist;
        expect(error.toString()).to.contain('field PaymentProviderAccountId missing');
      }
    }); /** End of "cannot create forex transactions without the paymentProvider account" */
  }); /** End of "required fields" */

  describe('Sender Converts currency', () => {
    it('bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobEURWallet',
          currency: 'EUR',
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
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        walletProviderFee: 100,
        WalletProviderAccountId: 'opencollectiveHost',
        walletProviderWallet: {
          name: 'opencollectiveHostWallet',
          AccountId: 'opencollectiveHost',
          OwnerAccountId: 'opencollectiveHost',
        },
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insertParsedTransaction(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      // Get all generated Transactions
      const accountToAccountTransaction = cashinResult[1];
      const accountToPaymentProviderTransaction = cashinResult[3];
      const paymentProviderToAccountTransaction = cashinResult[5];
      const walletProviderFeeTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const toAccountEurTemporaryWallet = await walletService.getOne({
          currency:transaction.currency,
          AccountId: transaction.ToAccountId,
      });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });

      /* Expectations
        1) bob send 15 EUR to alice(temporary EUR Wallet) - Account to Account transaction
        2) alice converts 15EUR to 20USD through stripe
        3) alice pays fees(in this case, only wallet provider fee)
      */

      // 1) bob sends 15EUR to alice's temporary wallet
      expect(accountToAccountTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(accountToAccountTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(accountToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToAccountTransaction.ToWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToAccountTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToAccountTransaction.amount).to.be.equal(transaction.amount);

      // 2.1) Conversion transactions: alice sends EUR to stripe, then stripe sends USD to alice
      expect(accountToPaymentProviderTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToPaymentProviderTransaction.FromWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToPaymentProviderTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(accountToPaymentProviderTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(accountToPaymentProviderTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToPaymentProviderTransaction.amount).to.be.equal(transaction.amount);
      // 2.2) Conversion transactions: Then stripe sends USD to alice
      expect(paymentProviderToAccountTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderToAccountTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderToAccountTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderToAccountTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderToAccountTransaction.amount).to.be.equal(transaction.destinationAmount);
      // 3) alice pays wallet provider fee
      expect(walletProviderFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      expect(walletProviderFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeTransaction.amount).to.be.equal(transaction.walletProviderFee);
    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only wallet provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only payment provider fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobEURWallet',
          currency: 'EUR',
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
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        paymentProviderFee: 100,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insertParsedTransaction(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      // Get all generated Transactions
      const accountToAccountTransaction = cashinResult[1];
      const accountToPaymentProviderTransaction = cashinResult[3];
      const paymentProviderToAccountTransaction = cashinResult[5];
      const paymentProviderFeeTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const toAccountEurTemporaryWallet = await walletService.getOne({
          currency:transaction.currency,
          AccountId: transaction.ToAccountId,
      });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });

      /* Expectations
        1) bob send 15 EUR to alice(temporary EUR Wallet) - Account to Account transaction
        2) alice converts 15EUR to 20USD through stripe
        3) alice pays fees(in this case, only wallet provider fee)
      */

      // 1) bob sends 15EUR to alice's temporary wallet
      expect(accountToAccountTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(accountToAccountTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(accountToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToAccountTransaction.ToWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToAccountTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToAccountTransaction.amount).to.be.equal(transaction.amount);

      // 2.1) Conversion transactions: alice sends EUR to stripe, then stripe sends USD to alice
      expect(accountToPaymentProviderTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToPaymentProviderTransaction.FromWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToPaymentProviderTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(accountToPaymentProviderTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(accountToPaymentProviderTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToPaymentProviderTransaction.amount).to.be.equal(transaction.amount);
      // 2.2) Conversion transactions: Then stripe sends USD to alice
      expect(paymentProviderToAccountTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderToAccountTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderToAccountTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderToAccountTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderToAccountTransaction.amount).to.be.equal(transaction.destinationAmount);
      // 3) alice pays payment provider fee
      expect(paymentProviderFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeTransaction.amount).to.be.equal(transaction.paymentProviderFee);
    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only payment provider fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, only platform fee', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobEURWallet',
          currency: 'EUR',
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
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
        platformFee: 100,
        PaymentProviderAccountId: 'stripe',
        paymentProviderWallet: {
          name: 'stripeWallet',
          AccountId: 'stripe',
          OwnerAccountId: 'stripe',
        },
      };
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insertParsedTransaction(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(8);
      // Get all generated Transactions
      const accountToAccountTransaction = cashinResult[1];
      const accountToPaymentProviderTransaction = cashinResult[3];
      const paymentProviderToAccountTransaction = cashinResult[5];
      const platformFeeTransaction = cashinResult[7];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const toAccountEurTemporaryWallet = await walletService.getOne({
          currency:transaction.currency,
          AccountId: transaction.ToAccountId,
      });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      const platformWallet = await walletService.getOne({ AccountId: 'platform', OwnerAccountId: 'platform' });
      /* Expectations
        1) bob send 15 EUR to alice(temporary EUR Wallet) - Account to Account transaction
        2) alice converts 15EUR to 20USD through stripe
        3) alice pays fees(in this case, only wallet provider fee)
      */

      // 1) bob sends 15EUR to alice's temporary wallet
      expect(accountToAccountTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(accountToAccountTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(accountToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToAccountTransaction.ToWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToAccountTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToAccountTransaction.amount).to.be.equal(transaction.amount);

      // 2.1) Conversion transactions: alice sends EUR to stripe, then stripe sends USD to alice
      expect(accountToPaymentProviderTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToPaymentProviderTransaction.FromWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToPaymentProviderTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(accountToPaymentProviderTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(accountToPaymentProviderTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToPaymentProviderTransaction.amount).to.be.equal(transaction.amount);
      // 2.2) Conversion transactions: Then stripe sends USD to alice
      expect(paymentProviderToAccountTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderToAccountTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderToAccountTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderToAccountTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderToAccountTransaction.amount).to.be.equal(transaction.destinationAmount);
      // 3) alice pays platform provider fee
      expect(platformFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeTransaction.ToAccountId).to.be.equal('platform');
      expect(platformFeeTransaction.ToWalletId).to.be.equal(platformWallet.id);
      expect(platformFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(platformFeeTransaction.amount).to.be.equal(transaction.platformFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, only platform fee" */

    it('bob sends 15EUR(converted to 20USD) to alice, all fees', async () => {
      // first sends money from Credit Card Wallet to USD Wallet
      const originalTransaction = {
        FromAccountId: 'bob',
        fromWallet: {
          name: 'bobEURWallet',
          currency: 'EUR',
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
        currency: 'EUR',
        destinationAmount: 2000,
        destinationCurrency: 'USD',
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
      const transaction = { ...originalTransaction };
      const cashinResult = await transactionService.insertParsedTransaction(originalTransaction);

      // check if initial Cashin transaction generates 8 transactions(4 conversion, 2 normal and 2 wallet provider fee transactions, DEBIT AND CREDIT)
      expect(cashinResult).to.be.an('array');
      expect(cashinResult).to.have.lengthOf(12);
      // Get all generated Transactions
      const accountToAccountTransaction = cashinResult[1];
      const accountToPaymentProviderTransaction = cashinResult[3];
      const paymentProviderToAccountTransaction = cashinResult[5];
      const paymentProviderFeeTransaction = cashinResult[7];
      const platformFeeTransaction = cashinResult[9];
      const walletProviderFeeTransaction = cashinResult[11];
      // finding generated wallets
      const fromAccountWallet = await walletService.getOne({ name: transaction.fromWallet.name });
      const toAccountWallet = await walletService.getOne({ name: transaction.toWallet.name });
      const toAccountEurTemporaryWallet = await walletService.getOne({
          currency:transaction.currency,
          AccountId: transaction.ToAccountId,
      });
      const paymentProviderWallet = await walletService.getOne({ name: transaction.paymentProviderWallet.name });
      const platformWallet = await walletService.getOne({ AccountId: 'platform', OwnerAccountId: 'platform' });
      const walletProviderWallet = await walletService.getOne({ name: transaction.walletProviderWallet.name });
      /* Expectations
        1) bob send 15 EUR to alice(temporary EUR Wallet) - Account to Account transaction
        2) alice converts 15EUR to 20USD through stripe
        3) alice pays fees(in this case, only wallet provider fee)
      */

      // 1) bob sends 15EUR to alice's temporary wallet
      expect(accountToAccountTransaction.FromAccountId).to.be.equal(transaction.FromAccountId);
      expect(accountToAccountTransaction.FromWalletId).to.be.equal(fromAccountWallet.id);
      expect(accountToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToAccountTransaction.ToWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToAccountTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToAccountTransaction.amount).to.be.equal(transaction.amount);

      // 2.1) Conversion transactions: alice sends EUR to stripe, then stripe sends USD to alice
      expect(accountToPaymentProviderTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(accountToPaymentProviderTransaction.FromWalletId).to.be.equal(toAccountEurTemporaryWallet.id);
      expect(accountToPaymentProviderTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(accountToPaymentProviderTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(accountToPaymentProviderTransaction.currency).to.be.equal(transaction.currency);
      expect(accountToPaymentProviderTransaction.amount).to.be.equal(transaction.amount);
      // 2.2) Conversion transactions: Then stripe sends USD to alice
      expect(paymentProviderToAccountTransaction.FromAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderToAccountTransaction.FromWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderToAccountTransaction.ToAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderToAccountTransaction.ToWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderToAccountTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderToAccountTransaction.amount).to.be.equal(transaction.destinationAmount);
      // 3.1) alice pays payment provider fee
      expect(paymentProviderFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(paymentProviderFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(paymentProviderFeeTransaction.ToAccountId).to.be.equal(transaction.PaymentProviderAccountId);
      expect(paymentProviderFeeTransaction.ToWalletId).to.be.equal(paymentProviderWallet.id);
      expect(paymentProviderFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(paymentProviderFeeTransaction.amount).to.be.equal(transaction.paymentProviderFee);
      // 3.2) alice pays platform provider fee
      expect(platformFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(platformFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(platformFeeTransaction.ToAccountId).to.be.equal('platform');
      expect(platformFeeTransaction.ToWalletId).to.be.equal(platformWallet.id);
      expect(platformFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(platformFeeTransaction.amount).to.be.equal(transaction.platformFee);
      // 3.3) alice pays wallet provider fee
      expect(walletProviderFeeTransaction.FromAccountId).to.be.equal(transaction.ToAccountId);
      expect(walletProviderFeeTransaction.FromWalletId).to.be.equal(toAccountWallet.id);
      expect(walletProviderFeeTransaction.ToAccountId).to.be.equal(transaction.WalletProviderAccountId);
      expect(walletProviderFeeTransaction.ToWalletId).to.be.equal(walletProviderWallet.id);
      expect(walletProviderFeeTransaction.currency).to.be.equal(transaction.destinationCurrency);
      expect(walletProviderFeeTransaction.amount).to.be.equal(transaction.walletProviderFee);

    }); /** End of "bob sends 15EUR(converted to 20USD) to alice, all fees" */
  }); /** End of "Sender Converts currency" */

}); /** End of "Forex transactions" */

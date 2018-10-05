/**
 * Test around the @{TransactionForexStrategy}
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

describe('Forex Transactions', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  const transactionService = new TransactionService();
  const providerService = new ProviderService();

  let account1, account1WalletEUR, account2, account2WalletUSD, accountProvider, provider, walletProvider, paymentProviderAccount, paymentProviderWallet;

  beforeEach(async () => {
    await ResetDb.run();
    // EUR Provider: The account, the provider and the wallet
    accountProvider = await accountService.insert({ slug: 'provider' });
    provider = await providerService.insert({
      name: 'provider',
      fixedFee: 0,
      percentFee: 0.05,
      service: paymentMethodServices.opencollective.name,
      type: paymentMethodServices.opencollective.types.COLLECTIVE,
      OwnerAccountId: accountProvider.id,
    });
    walletProvider = await walletService.insert({
      OwnerAccountId: accountProvider.id,
      currency: 'MULTI',
      name: 'provider_USD',
      ProviderId: null,
    });
    // Creates Account1 Account and its EUR wallet
    account1 = await accountService.insert({ slug: 'account1' });
    account1WalletEUR = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'EUR',
      name: 'account1-EUR',
      ProviderId: provider.id,
    });
    // Creates Account2 Account and its USD wallet
    account2 = await accountService.insert({ slug: 'account2' });
    account2WalletUSD = await walletService.insert({
      OwnerAccountId: account1.id,
      currency: 'USD',
      name: 'account2-USD',
      ProviderId: provider.id,
    });
    
    paymentProviderAccount = await accountService.insert({ slug: 'payment-provider' });
    paymentProviderWallet = await walletService.insert({
      OwnerAccountId: paymentProviderAccount.id,
      currency: 'MULTI',
      name: 'paymentProvider-MULTI',
      ProviderId: null,
    });
  });

  // assure test db will be reset in case of more tests
  after(async () => {
    await ResetDb.run();
  });

  it('cannot create forex transactions without a paymentProvider wallet)', async () => {
    try {
      await transactionService.insert({
        FromWalletId: account1WalletEUR.id, // The original WalletId where the money is going to be sent 
        ToWalletId: account2WalletUSD.id, // The Destination WalletId
        amount: 3000, // The amount(same currency as defined in the "currency" field) to be sent
        currency: 'EUR', // The currency to be sent
        destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
        destinationCurrency: 'USD', // The currency to be received
        platformFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      });
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain('field paymentProviderWalletId missing');
    }
  }); /** End of "Regular Account cashes in from its creditcard wallet to its USD wallet(Without Platform Payment Provider Fees) Should generate 4 transactions(2 Regarding Wallet Provider fees and 2 regarding the transaction itself )" */

  it('account1 sends 30EUR(that will become 45USD) to account2 with wallet provider fees', async () => {
    const result = await transactionService.insert({
      FromWalletId: account1WalletEUR.id, // The original WalletId where the money is going to be sent 
      ToWalletId: account2WalletUSD.id, // The Destination WalletId
      amount: 3000, // The amount(same currency as defined in the "currency" field) to be sent
      currency: 'EUR', // The currency to be sent
      destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
      destinationCurrency: 'USD', // The currency to be received
      // platformFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      // paymentProviderFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // check if initial Cashin transaction generates 8 transactions
    // - 4 conversion transactons(2 * Credit and Debit transactions)
    //   - from EUR account1 to Payment provider
    //   - from USD Payment provider to account1
    // - 2 "account to account" transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Wallet Providers transactons( USD account1 to USD account2, DEBIT and CREDIT)
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(8);

  }); /** End of "account1 sends 30EUR(that will become 45USD) to account2 with wallet provider fees" */

  it('account1 sends 30EUR(that will become 45USD) to account2 with payment providers and wallet providers fees', async () => {
    const result = await transactionService.insert({
      FromWalletId: account1WalletEUR.id, // The original WalletId where the money is going to be sent 
      ToWalletId: account2WalletUSD.id, // The Destination WalletId
      amount: 3000, // The amount(same currency as defined in the "currency" field) to be sent
      currency: 'EUR', // The currency to be sent
      destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
      destinationCurrency: 'USD', // The currency to be received
      paymentProviderFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // check if initial Cashin transaction generates 10 transactions
    // - 4 conversion transactons(2 * Credit and Debit transactions)
    //   - from EUR account1 to Payment provider
    //   - from USD Payment provider to account1
    // - 2 "account to account" transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Payment providers fee transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Wallet Providers transactons( USD account1 to USD account2, DEBIT and CREDIT)
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(10);

  }); /** End of "account1 sends 30EUR(that will become 45USD) to account2 with payment providers and wallet providers fees" */

  it('account1 sends 30EUR(that will become 45USD) to account2 with platform and wallet providers fees', async () => {
    const result = await transactionService.insert({
      FromWalletId: account1WalletEUR.id, // The original WalletId where the money is going to be sent 
      ToWalletId: account2WalletUSD.id, // The Destination WalletId
      amount: 3000, // The amount(same currency as defined in the "currency" field) to be sent
      currency: 'EUR', // The currency to be sent
      destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
      destinationCurrency: 'USD', // The currency to be received
      platformFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // console.log(`result of FOREX: ${JSON.stringify(result, null, 2)}`);
    // check if initial Cashin transaction generates 10 transactions
    // - 4 conversion transactons(2 * Credit and Debit transactions)
    //   - from EUR account1 to Payment provider
    //   - from USD Payment provider to account1
    // - 2 "account to account" transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Platform fee transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Wallet Providers transactons( USD account1 to USD account2, DEBIT and CREDIT)
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(10);

  }); /** End of "account1 sends 30EUR(that will become 45USD) to account2 with platform and wallet providers fees" */

  it('account1 sends 30EUR(that will become 45USD) to account2 with all fees(payment providers, platform and wallet providers)', async () => {
    // console.log(JSON.stringify(account1WalletEUR, null, 2));
    // console.log(JSON.stringify(account2WalletUSD, null, 2));
    const result = await transactionService.insert({
      FromWalletId: account1WalletEUR.id, // The original WalletId where the money is going to be sent 
      ToWalletId: account2WalletUSD.id, // The Destination WalletId
      amount: 3000, // The amount(same currency as defined in the "currency" field) to be sent
      currency: 'EUR', // The currency to be sent
      destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
      destinationCurrency: 'USD', // The currency to be received
      platformFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      paymentProviderFee: 100, // if it's a forex Transaction the currency of all fees is by default the "destinationCurrency" field
      paymentProviderWalletId: paymentProviderWallet.id,
    });
    // console.log(`result of FOREX: ${JSON.stringify(result, null, 2)}`);
    // check if initial Cashin transaction generates 12 transactions
    // - 4 conversion transactons(2 * Credit and Debit transactions)
    //   - from EUR account1 to Payment provider
    //   - from USD Payment provider to account1
    // - 2 "account to account" transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Payment providers fee transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Platform fee transactons( USD account1 to USD account2, DEBIT and CREDIT)
    // - 2 Wallet Providers transactons( USD account1 to USD account2, DEBIT and CREDIT)
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(12);

  }); /** End of "account1 sends 30EUR(that will become 45USD) to account2 with all fees(payment providers, platform and wallet providers)" */

}); /** End of "Forex Transactions" */

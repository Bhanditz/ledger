/**
 * Test around the @{TransactionService}
 *
 * @module test/user/service
 */
import { expect } from 'chai';
import TransactionService from '../server/services/transactionService';
import AccountService from '../server/services/accountService';
import WalletService from '../server/services/walletService';
import ResetDb from '../server/util/resetDb';
import { transactionTypeEnum } from '../server/globals/enums/transactionTypeEnum';

describe('TransactionService', () => {
  const transactionService = new TransactionService();
  const accountService = new AccountService();
  const walletService = new WalletService();

  beforeEach(async () => {
    await ResetDb.run();
  });
  after(async () => {
    await ResetDb.run();
  });

  it('the service should exist', () => {
    expect(TransactionService).to.exist;
  }); /** End of "the service must exist" */

  it('the service methods should exist', () => {
    expect(transactionService.get).to.exist;
    expect(transactionService.insert).to.exist;
    expect(transactionService.update).to.exist;
    expect(transactionService.delete).to.exist;
  }); /** End of "the service methods must exist" */

  it('Should returns an EMPTY array of transactions as there is NO Transactions', () => {
    return transactionService.get({ ToAccountId: 1 }).then((transactions) => {
      expect(transactions).deep.equals([]);
    });
  }); /** End of "Should returns an EMPTY array of transactions as there is NO Transactions" */

  it('Should fail to create a transaction because transaction has no FromWalletId defined', async () => {
    let account1, account2;
    try {
      // creates account 1 and 2
      account1 = await accountService.insert({ slug: 'account1' });
      account2 = await accountService.insert({ slug: 'account2' });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account2.id,  amount: 15, currency: 'USD' });
      throw Error('Should have failed');
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain('Missing field FromWalletId');
    }
  }); /** End of "Should fail to create a transaction because transaction has no FromWalletId defined" */

  it('Should fail to create a transaction because transaction has no ToWalletId defined', async () => {
    let account1, account2;
    try {
      // creates account 1 and 2
      account1 = await accountService.insert({ slug: 'account1' });
      account2 = await accountService.insert({ slug: 'account2' });
      // then creates wallet for account 1
      const account1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'multi', name: 'account1_CreditCard' });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account2.id, FromWalletId: account1wallet.id, amount: 15, currency: 'USD' });
      throw Error('Should have failed');
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain('Missing field ToWalletId');
    }
  }); /** End of "Should fail to create a transaction because transaction has no ToWalletId defined" */

  it('Should fail to create a transaction because account1 has no Default Cashin Wallet', async () => {
    let account1, account2;
    try {
      // creates account 1 and 2
      account1 = await accountService.insert({ slug: 'account1' });
      account2 = await accountService.insert({ slug: 'account2' });
      // then creates wallet for account 1
      const account1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'multi', name: 'account1_CreditCard' });
      // then creates wallet for account 1
      const account2wallet = await walletService.insert({ OwnerAccountId: account2.id, currency: 'multi', name: 'account2_CreditCard' });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account2.id, FromWalletId: account1wallet.id, ToWalletId: account2wallet.id, amount: 15, currency: 'USD' });
      throw Error('Should have failed');
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain(`Account id ${account1.id} does not have DefaultCashinWalletId`);
    }
  }); /** End of "Should fail to create a transaction because account1 has no Default Cashin Wallet" */

  it('Should fail to create transaction because FromWallet needs to be different than ToWallet', async () => {
    try {
      // creates account 1 and 2
      const account1 = await accountService.insert({ slug: 'account1' });
      // then creates wallet for account 1
      const defaultAccount1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'multi', name: 'account1_CreditCard' });
      // then sets wallet as default cash in wallet
      await accountService.update({ DefaultCashinWalletId: defaultAccount1wallet.id }, { id: account1.id });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account1.id, ToWalletId: defaultAccount1wallet.id, amount: 15, currency: 'USD' });
      throw Error('Should have failed');
    } catch (error) {
      expect(error).to.exist;
      expect(error.toString()).to.contain('Operation not allowed: FromWalletId === ToWalletId');
    }
  }); /** End of "Should fail to create transaction because FromWallet needs to be different than ToWallet" */

  it('Should create a cashin transaction: 2 transactions(CREDIT AND DEBIT) to account1', async () => {
    try {
      // creates account 1 and 2
      const account1 = await accountService.insert({ slug: 'account1' });
      // then creates default wallet for account 1
      const defaultAccount1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'multi', name: 'account1_CreditCard' });
      // then sets wallet as default cash in wallet
      await accountService.update({ DefaultCashinWalletId: defaultAccount1wallet.id }, { id: account1.id });
      // then creates "not default" wallet for account 1
      const notDefaultAccount1Wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'USD', name: 'account1_USD' });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account1.id, ToWalletId: notDefaultAccount1Wallet.id, amount: 15, currency: 'USD' });
      // should have 2 transactions
      const allTransactions = await transactionService.get();
      expect(allTransactions).to.have.lengthOf(2);
      // must have only one transaction of type credit with positive amount of 15usd
      const account1CreditTransactions = allTransactions
        .filter(tx => tx.type === transactionTypeEnum.CREDIT);
      expect(account1CreditTransactions).to.have.lengthOf(1);
      expect(account1CreditTransactions[0].amount).to.be.equal(15);
      // must have only one transaction of type debit with negative amount of 15usd
      const account1DebitTransactions = allTransactions
        .filter(tx => tx.type === transactionTypeEnum.DEBIT);
      expect(account1DebitTransactions).to.have.lengthOf(1);
      expect(account1DebitTransactions[0].amount).to.be.equal(-15);
    } catch (error) {
      throw error;
    }
  }); /** End of "Should create a cashin transaction: 2 transactions(CREDIT AND DEBIT) to account1" */

  it('Should create 4 transactions: 2 cashins(CREDIT, DEBIT) for account1, 2 sending(CREDIT, DEBIT) from account1 to account 2', async () => {
    let account1, account2;
    try {
      // creates account 1 and 2
      account1 = await accountService.insert({ slug: 'account1' });
      account2 = await accountService.insert({ slug: 'account2' });
      // then creates wallet for account 1
      const defaultAccount1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'multi', name: 'account1_CreditCard' });
      // then creates "normal" wallet for account 1
      const account1wallet = await walletService.insert({ OwnerAccountId: account1.id, currency: 'USD', name: 'account1_USD' });
      // then creates wallet for account 2
      const account2wallet = await walletService.insert({ OwnerAccountId: account2.id, currency: 'USD', name: 'account2_USD' });
      // then sets wallet as default cash in wallet
      await accountService.update({ DefaultCashinWalletId: defaultAccount1wallet.id }, { id: account1.id });
      // then tries to create a transaction(should fail)
      await transactionService.insert({ FromAccountId: account1.id, ToAccountId: account2.id, FromWalletId: account1wallet.id, ToWalletId: account2wallet.id, amount: 15, currency: 'USD' });
      // then 4 transactions should be generated
      const allTransactions = await transactionService.get();
      expect(allTransactions).to.have.lengthOf(4);
      // 1 credit to account 1
      const account1CreditTransactions = allTransactions
        .filter(tx => tx.type === transactionTypeEnum.CREDIT && tx.ToAccountId === account1.id);
      expect(account1CreditTransactions).to.have.lengthOf(1);
      expect(account1CreditTransactions[0].amount).to.be.equal(15);
      // 1 credit of 15usd to account 1
      const account2CreditTransactions = allTransactions
        .filter(tx => tx.type === transactionTypeEnum.CREDIT && tx.ToAccountId === account2.id);
      expect(account2CreditTransactions).to.have.lengthOf(1);
      expect(account2CreditTransactions[0].amount).to.be.equal(15);
      // expect(error.toString()).to.contain(`Account id ${account1.id} does not have DefaultCashinWalletId`);
    } catch (error) {
      throw error;
    }
  }); /** End of "Should create 4 transactions: 2 cashins(CREDIT, DEBIT) for account1, 2 sending(CREDIT, DEBIT) from account1 to account 2" */

});/** End of "TransactionService" */
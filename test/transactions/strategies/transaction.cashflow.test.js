/**
 * Test around the @{TransactionCashFlow}
 *
 * @module test/transactions/strategies
 */
import { expect } from 'chai';
import AccountService from '../../../server/services/accountService';
import WalletService from '../../../server/services/walletService';
import TransactionService from '../../../server/services/transactionService';
import ResetDb from '../../../server/util/resetDb';
import { paymentMethodServices } from '../../../server/globals/enums/paymentMethodServices';
// import { operationNotAllowed } from '../../../server/globals/errors';
// import { transactionTypeEnum } from '../../../server/globals/enums/transactionTypeEnum';

describe('TransactionCashFlow', () => {
  const accountService = new AccountService();
  const walletService = new WalletService();
  const transactionService = new TransactionService();

  after(async () => {
    await ResetDb.run();
  });

  describe('<<<<TODO : BETTER NAMING HERE LATER>>>>>', () => {
    let account, walletUsd, walletCreditCard;

    beforeEach(async () => {
      await ResetDb.run();
      // Creates 2 Accounts
      account = await accountService.insert({ slug: 'account1' });
      walletUsd = await walletService.insert({
        OwnerAccountId: account.id,
        currency: 'USD',
        name: 'account1_USD',
        service: paymentMethodServices.opencollective.name,
        type: paymentMethodServices.opencollective.types.COLLECTIVE,
      });
      walletCreditCard = await walletService.insert({
        OwnerAccountId: account.id,
        currency: 'USD',
        name: 'account1_CC',
        service: paymentMethodServices.stripe.name,
        type: paymentMethodServices.stripe.types.CREDITCARD,
      });
    });

    it('Creates a Cashin Transaction', async () => {
      const amountTransaction = 1500;
      const currencyTransaction = 'USD';
      const cashinResult = await transactionService.insert({
        FromAccountId: account.id,
        ToAccountId: account.id,
        FromWalletId:walletCreditCard.id,
        ToWalletId: walletUsd.id,
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

  }); /** End of "Transactions Creation" */

}); /** End of "Transactions CRUD" */

/**
 * Test around the @{Accounts CRUD}
 *
 * @module test/models
 */
import { expect } from 'chai';
import AccountService from '../../server/services/accountService';
import ResetDb from '../../server/util/resetDb';

describe('Accounts CRUD', () => {
  const accountService = new AccountService();

  after(async () => {
    await ResetDb.run();
  });

  describe('Accounts Creation', () => {
    let account;

    before(async () => {
      await ResetDb.run();
    });

    it('should fail to create an Account without a slug', async () => {
      try {
        await accountService.insert({});
        throw Error('Should Not Get Here');
      } catch (error) {
        expect(error).to.exist;
        expect(error.errors).to.have.length.above(0);
        expect(error.errors[0]).to.have.property('message');
        expect(error.errors[0].message).to.be.equal('Account.slug cannot be null');
      }

    }); /** End of "Creates an Account" */

    it('Creates an Account', async () => {
      const accountSlug = 'bobAccount';
      account = await accountService.insert({ slug: accountSlug });
      expect(account).to.have.property('slug');
      expect(account.slug).to.be.equal(accountSlug);
    }); /** End of "Creates an Account" */

  }); /** End of "Accounts Creation" */

}); /** End of "Accounts CRUD" */

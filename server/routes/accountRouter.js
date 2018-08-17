import HttpStatus from 'http-status-codes';
import AbstractRouter from './abstractRouter';
import AccountService from '../services/accountService';
import AccountValidator from './validators/accountValidator';

export default class AccountRouter extends AbstractRouter {

  constructor(app) {
    super(app, new AccountService(), 'accounts', new AccountValidator());
  }

  /**
   * @api {get} /accounts Get Accounts
   * @apiName get_accounts
   * @apiGroup Accounts
   *
   * @apiParam {String} [slug] currency of the amount field
   * @apiParam {Number} [DefaultCashinWalletId] id of the default cashin wallet
   * @apiParam {Number} [DefaultCashoutWalletId] id of the default cashout wallet
   * @apiParam {String} [createdAt] Date the account was created
   * @apiParam {String} [updatedAt] Date the account was updated
   */
  get() {
    super.get();
  }

  /**
   * @api {post} /accounts Post Accounts
   * @apiName post_accounts
   * @apiGroup Accounts
   *
   * @apiParam {String} slug currency of the amount field
   */
  post() {
    super.post();
  }

  /**
   * @api {put} /accounts Put Accounts
   * @apiName put_accounts
   * @apiGroup Accounts
   * @apiParam {Number} [slug] unique string identifier of the account
   * @apiParam {Number} [DefaultCashinWalletId] id of the default cashin wallet
   * @apiParam {Number} [DefaultCashoutWalletId] id of the default cashout wallet
   */
  put() {
    this.app.put(this.path, (req, res) => {
      if (!req.query.id) {
        throw Error('Account id undefined');
      }
      this.service.update(req.body, { id: req.query.id } ).then( data => {
        res.send({ updated: data });
      }).catch(error => {
        this.logger.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error);
      });
    });
  }
}

import HttpStatus from 'http-status-codes';
import AbstractRouter from './abstractRouter';
import AccountService from '../services/accountService';
import AccountValidator from './validators/accountValidator';

export default class AccountRouter extends AbstractRouter {

  constructor(app) {
    super(app, new AccountService(), 'accounts', new AccountValidator());
  }

  put() {
    this.app.put(this.path, (req, res) => {
      if (!req.query.id) {
        throw Error('Account id undefined');
      }
      this.service.put(req.body, { id: req.query.id } ).then( data => {
        res.send({ updated: data });
      }).catch(error => {
        this.logger.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error);
      });
    });
  }
}

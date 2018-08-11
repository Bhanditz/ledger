import AbstractRouter from './abstractRouter';
import AccountService from '../services/accountService';
import AccountValidator from './validators/accountValidator';

export default class AccountRouter extends AbstractRouter {

  constructor(app) {
    super(app, new AccountService(), 'accounts', new AccountValidator());
  }
}

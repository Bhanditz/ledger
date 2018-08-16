import AbstractCrudService from './abstractCrudService';
import Account from '../models/Account';

export default class AccountService extends AbstractCrudService {
  constructor() {
    super(Account);
  }
}

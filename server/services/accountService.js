import AbstractCrudService from './abstractCrudService';
import models from '../models';

export default class AccountService extends AbstractCrudService {
  constructor() {
    super(models.Account);
  }
}

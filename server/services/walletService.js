import AbstractCrudService from './abstractCrudService';
import models from '../models';

export default class WalletService extends AbstractCrudService {
  constructor() {
    super(models.Wallet);
  }
}

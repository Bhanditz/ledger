import AbstractCrudService from './abstractCrudService';
import Wallet from '../models/Wallet';

export default class WalletService extends AbstractCrudService {

  constructor() {
    super(Wallet);
  }

}

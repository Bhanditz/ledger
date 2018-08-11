import AbstractRouter from './abstractRouter';
import WalletService from '../services/walletService';

export default class WalletRouter extends AbstractRouter {

  constructor(app) {
    super(app, new WalletService(), 'wallets', null);
  }

}

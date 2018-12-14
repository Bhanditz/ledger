import AbstractRouter from './abstractRouter';
import WalletService from '../services/walletService';

export default class WalletRouter extends AbstractRouter {

  constructor(app) {
    super(app, new WalletService(), 'transactions');
  }

  /**
   * @api {get} /wallets Get Wallets
   * @apiName get_wallets
   * @apiGroup Wallets
   *
   * @apiParam {Number} [id] wallet id
   * @apiParam {Number} [AccountId] The account that the wallet belongs to
   * @apiParam {Number} [OwnerAccountId] The Owner Account of the wallet
   * @apiParam {String} [name] name of the wallet
   * @apiParam {String} [currency] currency of the amount field
   * @apiParam {String} [createdAt] Date the transaction was created
   * @apiParam {String} [updatedAt] Date the transaction was updated
   */
  get() {
    super.get();
  }

  /**
   * @api {post} /wallets Post Wallets
   * @apiName post_wallets
   * @apiGroup Wallets
   *
   * @apiParam {Number} [AccountId] The account that the wallet belongs to
   * @apiParam {Number} [OwnerAccountId] The Owner Account of the wallet
   * @apiParam {String} [name] name of the wallet
   * @apiParam {String} [currency] currency of the wallet
   * @apiParam {Number} [PaymentMethodId] The legacy Payment method Id
   * @apiParam {Number} [SourcePaymentMethodId] The legacy Source Payment Method Id
   * @apiParam {Number} [OrderId] The legacy Order Id
   * @apiParam {Number} [ExpenseId] The legacy Expense Id
   * @apiParam {Number} [SourceWalletId] The Wallet id of the Source Wallet in case this wallet is a gift card
   * @apiParam {String} [expiryDate] the date that this wallet will be no longer active
   * @apiParam {Number} [maxBalance] max amount this wallet can spend
   * @apiParam {Number} [monthlyMaxBalance] monthly amount that this wallet can spend
   * @apiParam {String} [type] type of the Wallet
   * @apiParam {String} [description] short description of the wallet
   */
  post() {
    super.post();
  }

}

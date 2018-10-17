import TransactionValidator from './validators/transactionValidator';
import AbstractRouter from './abstractRouter';
import TransactionService from '../services/transactionService';

export default class TransactionRouter extends AbstractRouter {

  constructor(app) {
    super(app, new TransactionService(), 'transactions', new TransactionValidator());
  }

  /**
   * @api {get} /transactions Get Transactions
   * @apiName post_transactions
   * @apiGroup Transactions
   *
   * @apiParam {Number} [FromAccountId] Account model
   * @apiParam {Number} [ToAccountId] Account model
   * @apiParam {Number} [FromWalletId] Wallet of the Account stated FromAccountId
   * @apiParam {Number} [ToWalletId] Wallet of the Account stated ToAccountId
   * @apiParam {Number} [amount] Amount of the transaction
   * @apiParam {String} [currency] currency of the amount field
   * @apiParam {String} [TransactionGroup] Group UUID of a transaction
   * @apiParam {String} [createdAt] Date the transaction was created
   * @apiParam {String} [updatedAt] Date the transaction was updated
   */
  get() {
    super.get();
  }

  /**
   * @api {post} /transactions Post Transactions
   * @apiName get_transactions
   * @apiGroup Transactions
   *
   * @apiParam {Number} FromWalletId Wallet of the Account stated FromAccountId
   * @apiParam {Number} ToWalletId Wallet of the Account stated ToAccountId
   * @apiParam {Number} amount Amount that's going to be taken from the FromAccount
   * @apiParam {String} currency currency of the amount field
   * @apiParam {Number}  [platformFee] the platform fee in cents
   * @apiParam {Number}  [paymentProviderFee] the payment provider fee in cents
   * @apiParam {Number}  [PaymentProviderWalletId] the payment provider wallet id
   * @apiParam {Number}  [walletProviderFee] the wallet provider fee in cents
   * @apiParam {Boolean} [senderPayFees] boolean indicating whether the sender will pay fees
   */
  post() {
    super.post();
  }

}

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
   * @apiParam {Number} [FromWalletName] Wallet of the Account stated FromAccountId
   * @apiParam {Number} [ToWalletName] Wallet of the Account stated ToAccountId
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
   * @apiParam {String} FromAccountId The identification of the Account that's sending money
   * @apiParam {String} ToAccountId The identification of the Account that's receiving money
   * @apiParam {String} FromWalletName Wallet of the FromAccount
   * @apiParam {String} ToWalletName Wallet of the ToAccount
   * @apiParam {Number} amount Amount that's going to be taken from the FromWallet
   * @apiParam {String} currency currency of the amount field
   * @apiParam {Number} [destinationAmount] amount used in forex transactions
   * @apiParam {String} [destinationCurrency] currency of the destinationAmount field, used in forex transactions
   * @apiParam {Number}  [platformFee] the platform fee in cents(if forex transaction, in destinationCurrency)
   * @apiParam {Number}  [paymentProviderFee] the payment provider fee in cents(if forex transaction, in destinationCurrency)
   * @apiParam {String}  [PaymentProviderAccountId] Account id of the payment provider
   * @apiParam {String}  [PaymentProviderWalletName] Wallet of the payment provider
   * @apiParam {Number}  [walletProviderFee] the wallet provider fee in cents(if forex transaction, in destinationCurrency)
   * @apiParam {String}  [WalletProviderAccountId] Account id of the payment provider
   * @apiParam {String}  [WalletProviderWalletName] Wallet of the payment provider
   * @apiParam {Boolean} [senderPayFees] boolean indicating whether the sender will pay fees
   */
  post() {
    super.post();
  }

}
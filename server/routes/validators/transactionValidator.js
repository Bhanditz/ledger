import { check, oneOf } from 'express-validator/check';
import AbstractValidator from './abstractValidator';

export default class TransactionValidator extends AbstractValidator {
  constructor() {
    super();
  }

  post() {
    return [
      check('amount').isNumeric(),
      check('currency').isAlphanumeric().isLength({ min: 3, max: 4 }),
      oneOf([
        check('FromAccountId').isString(),
        check('FromAccountId').isNumeric(),
        check('FromAccountId').isAlphanumeric(),
      ]),
      check('fromWallet').optional().isJSON(),
      oneOf([
        check('ToAccountId').isString(),
        check('ToAccountId').isNumeric(),
        check('ToAccountId').isAlphanumeric(),
      ]),
      check('toWallet').optional().isJSON(),
      check('destinationAmount').optional().isNumeric(),
      check('destinationCurrency').optional().isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('platformFee').optional().isNumeric(), // Will have a default Wallet Id
      check('paymentProviderFee').optional().isNumeric(),
      oneOf([
        check('PaymentProviderAccountId').optional().isString(),
        check('PaymentProviderAccountId').optional().isNumeric(),
        check('PaymentProviderAccountId').optional().isAlphanumeric(),
      ]),
      check('paymentProviderWallet').optional().isJSON(),
      oneOf([
        check('WalletProviderAccountId').optional().isString(),
        check('WalletProviderAccountId').optional().isNumeric(),
        check('WalletProviderAccountId').optional().isAlphanumeric(),
      ]),
      check('walletProviderWallet').optional().isJSON(),
      check('walletProviderFee').optional().isNumeric(),
      check('senderPayFees').optional().isBoolean(), // default to false as receiver will pay fees by default
    ];
  }
}

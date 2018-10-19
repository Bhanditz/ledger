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
      oneOf([
        check('FromWalletName').isString(),
        check('FromWalletName').isNumeric(),
        check('FromWalletName').isAlphanumeric(),
      ]),
      oneOf([
        check('ToAccountId').isString(),
        check('ToAccountId').isNumeric(),
        check('ToAccountId').isAlphanumeric(),
      ]),
      oneOf([
        check('ToWalletName').isString(),
        check('ToWalletName').isNumeric(),
        check('ToWalletName').isAlphanumeric(),
      ]),
      check('destinationAmount').optional().isNumeric(),
      check('destinationCurrency').optional().isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('platformFee').optional().isNumeric(), // Will have a default Wallet Id
      check('paymentProviderFee').optional().isNumeric(),
      oneOf([
        check('PaymentProviderAccountId').optional().isString(),
        check('PaymentProviderAccountId').optional().isNumeric(),
        check('PaymentProviderAccountId').optional().isAlphanumeric(),
      ]),
      oneOf([
        check('PaymentProviderWalletName').optional().isString(),
        check('PaymentProviderWalletName').optional().isNumeric(),
        check('PaymentProviderWalletName').optional().isAlphanumeric(),
      ]),
      oneOf([
        check('WalletProviderAccountId').optional().isString(),
        check('WalletProviderAccountId').optional().isNumeric(),
        check('WalletProviderAccountId').optional().isAlphanumeric(),
      ]),
      oneOf([
        check('WalletProviderWalletName').optional().isString(),
        check('WalletProviderWalletName').optional().isNumeric(),
        check('WalletProviderWalletName').optional().isAlphanumeric(),
      ]),
      check('walletProviderFee').optional().isNumeric(),
      check('senderPayFees').optional().isBoolean(), // default to false as receiver will pay fees by default
    ];
  }
}

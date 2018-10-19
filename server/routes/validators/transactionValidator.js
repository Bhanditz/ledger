import { check } from 'express-validator/check';
import AbstractValidator from './abstractValidator';

export default class TransactionValidator extends AbstractValidator {
  constructor() {
    super();
  }

  post() {
    return [
      check('amount').isNumeric(),
      check('destinationAmount').isNumeric(),
      check('currency').isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('destinationCurrency').isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('FromAccountId').isAlphanumeric(),
      check('FromWalletName').isAlphanumeric(),
      check('ToAccountId').isAlphanumeric(),
      check('ToWalletName').isAlphanumeric(),
      check('platformFee').isNumeric(), // Will have a default Wallet Id
      check('paymentProviderFee').isNumeric(),
      check('PaymentProviderAccountId').isAlphanumeric(),
      check('PaymentProviderWalletName').isAlphanumeric(),
      check('WalletProviderAccountId').isAlphanumeric(),
      check('WalletProviderWalletName').isAlphanumeric(),
      check('walletProviderFee').isNumeric(),
      check('senderPayFees').isBoolean(), // default to false as receiver will pay fees by default
    ];
  }
}

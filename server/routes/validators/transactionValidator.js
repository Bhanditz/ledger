import { check } from 'express-validator/check';
import AbstractValidator from './abstractValidator';

export default class TransactionValidator extends AbstractValidator {
  constructor() {
    super();
  }

  post() {
    return [
      check('amount').isNumeric(),
      check('currency').isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('FromAccountId').isNumeric(),
      check('FromWalletId').isNumeric(),
      check('ToAccountId').isNumeric(),
      check('ToWalletId').isNumeric(),
      check('platformFee').isNumeric(), // Will have a default Wallet Id
      check('paymentProviderFee').isNumeric(),
      check('paymentProviderWalletId').isNumeric(),
      check('walletProviderFee').isNumeric(),
      check('senderPayFees').isBoolean(), // default to false as receiver will pay fees by default
    ];
  }
}

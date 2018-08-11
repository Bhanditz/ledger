import { check } from 'express-validator/check';
import AbstractValidator from './abstractValidator';

export default class TransactionValidator extends AbstractValidator {
  constructor() {
    super();
  }

  post() {
    return [
      check('FromWalletId').isNumeric(),
      check('ToWalletId').isNumeric(),
      check('amount').isNumeric(),
      check('currency').isAlphanumeric().isLength({ min: 3, max: 4 }),
      check('FromAccountId').isNumeric(),
      check('ToAccountId').isNumeric(),
    ];
  }
}

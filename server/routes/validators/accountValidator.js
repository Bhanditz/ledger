import { check } from 'express-validator/check';
import AbstractValidator from './abstractValidator';

export default class AccountValidator extends AbstractValidator {
  constructor() {
    super();
  }

  post() {
    return [check('slug').isAlphanumeric()];
  }

}

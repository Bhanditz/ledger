import AbstractFee from './abstractFee';
import { constants } from '../globals/constants';

export default class PlatformFee extends AbstractFee {

  constructor(transaction, fixedFee, percentFee, feeAccountId, feeWalletId){
    // setting Platform default fees(through params otherwise fixed fee is 0 and percent fee 5%)
    const platformFixedFee = fixedFee ? fixedFee : 0;
    const platformPercentFee = percentFee ? percentFee : 0.05;
    // setting Platform default Account and Wallet ids
    const platformAccountId = feeAccountId ? feeAccountId : constants.PLATFORM_ACCOUNT_ID;
    const platformWalletId = feeWalletId ? feeWalletId : constants.PLATFORM_WALLET_ID;
    super(transaction, platformFixedFee, platformPercentFee, platformAccountId, platformWalletId);
  }

}

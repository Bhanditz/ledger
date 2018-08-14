import AbstractFee from './abstractFee';

export default class HostFee extends AbstractFee {

  constructor(transaction, fixedFee, percentFee, feeAccountId, feeWalletId){
    super(transaction, fixedFee, percentFee, feeAccountId, feeWalletId);
  }

}

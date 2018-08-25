import AbstractTransactionStrategy from './abstractTransactionStrategy';
import TransactionLib from '../../transactionLib';
import WalletLib from '../../walletLib';
import { operationNotAllowed } from '../../../globals/errors';
import Wallet from '../../../models/Wallet';
import { paymentMethodServices } from '../../../globals/enums/paymentMethodServices';
import PaymentProviderFeeTransactions from '../../feeTransactions/paymentProviderFeeTransactions';
import PlatformFeeTransactions from '../../feeTransactions/platformFeeTransactions';

export default class TransactionCashFlow extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
    this.transactionLib = new TransactionLib();
    this.walletLib = new WalletLib();
  }

  async getTransactions() {
    let transactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    // incrementing transaction groupSequence according to the length of the array
    this.incomingTransaction.transactionGroupSequence = transactions.length;
    // finds the fromWallet
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If there is no money in Account Wallet, then it needs to Cash In
    if ( fromWalletBalance < this.incomingTransaction.amount &&
         fromWallet.type !== paymentMethodServices.stripe.types.CREDITCARD) {
      throw Error(operationNotAllowed(`Wallet(id ${this.incomingTransaction.FromWalletId}) does not have enough balance to complete transaction`));
    }
    // It means it's money coming into the system, so some fees apply
    if ( fromWallet.type === paymentMethodServices.stripe.types.CREDITCARD ) {
      // Adding Platform Fees Transactions
      const platformFeeTransaction = new PlatformFeeTransactions(this.incomingTransaction);
      await platformFeeTransaction.setTransactionInfo();
      transactions = transactions.concat(platformFeeTransaction.getFeeDoubleEntryTransactions());
      // once more incrementing transaction groupSequence according to the length of the array
      this.incomingTransaction.transactionGroupSequence = transactions.length;
       // Adding Payment Providers Fees Transactions
      const paymentProviderFeeTransactions = new PaymentProviderFeeTransactions(this.incomingTransaction);
      await paymentProviderFeeTransactions.setTransactionInfo();
      transactions = transactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());

    }
    return transactions;
  }

}

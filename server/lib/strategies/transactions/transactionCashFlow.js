import AbstractTransactionStrategy from './abstractTransactionStrategy';
import TransactionLib from '../../transactionLib';
import WalletLib from '../../walletLib';
import Wallet from '../../../models/Wallet';
import PaymentProviderFeeTransactions from '../../feeTransactions/paymentProviderFeeTransactions';
import PlatformFeeTransactions from '../../feeTransactions/platformFeeTransactions';
import Provider from '../../../models/Provider';
import WalletProviderFeeTransactions from '../../feeTransactions/walletProviderFeeTransactions';

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

    // PaymentProvider fee transactions -> Check whether payment provider has fees(> 0) and a wallet id defined
    if (this.incomingTransaction.paymentProviderFee && this.incomingTransaction.paymentProviderFee > 0 &&
        this.incomingTransaction.paymentProviderWalletId && this.incomingTransaction.paymentProviderAccountId) {
      // find Payment Provider wallet to generate transactions
      this.incomingTransaction.paymentProviderWallet = await Wallet.findById(this.incomingTransaction.paymentProviderWalletId);
      const paymentProviderFeeTransactions = new PaymentProviderFeeTransactions(this.incomingTransaction);
      await paymentProviderFeeTransactions.setTransactionInfo();
      // Add Payment Provider Fee transactions to transactions array
      transactions = transactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());
      // Increment transaction group sequence
      this.incomingTransaction.transactionGroupSequence = transactions.length;
    }
    // Plaftorm fee transactions -> Check whether Platform fee is > 0 
    if (this.incomingTransaction.platformFee || this.incomingTransaction.platformFee > 0) {
      // Generate platform fee transactions
      const platformFeeTransaction = new PlatformFeeTransactions(this.incomingTransaction);
      await platformFeeTransaction.setTransactionInfo();
      // Add Platform Fee transactions to transactions array
      transactions = transactions.concat(platformFeeTransaction.getFeeDoubleEntryTransactions());
      // Increment transaction group sequence
      this.incomingTransaction.transactionGroupSequence = transactions.length;
    }
    // if Wallet Provider has any fee, then create transactions
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    const fromWalletProvider = await Provider.findById(fromWallet.ProviderId);
    if (fromWalletProvider.fixedFee || fromWalletProvider.percentFee) {
      // Generate Wallet Fees Transactions
      this.incomingTransaction.fromWalletProvider = fromWalletProvider;
      this.incomingTransaction.fromWallet = fromWallet;
      const providerFeeTransaction = new WalletProviderFeeTransactions(this.incomingTransaction);
      await providerFeeTransaction.setTransactionInfo();
      // Add Wallet Provider Fee transactions to transactions array
      transactions = transactions.concat(providerFeeTransaction.getFeeDoubleEntryTransactions());
    }
    return transactions;
  }

}

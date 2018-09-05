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

  async setPaymentProviderFeeTransactions() {
    let paymentProviderFeeTransactions = null;
    if (this.incomingTransaction.paymentProviderFee && this.incomingTransaction.paymentProviderFee > 0 &&
      this.incomingTransaction.paymentProviderWalletId) {
      // find Payment Provider wallet to generate transactions
      this.incomingTransaction.paymentProviderWallet = await Wallet.findById(this.incomingTransaction.paymentProviderWalletId);
      paymentProviderFeeTransactions = new PaymentProviderFeeTransactions(this.incomingTransaction);
      await paymentProviderFeeTransactions.setTransactionInfo();
    }
    return paymentProviderFeeTransactions;
  }

  async setPlatformFeeTransactions() {
    let platformFeeTransaction = null;
    if (this.incomingTransaction.platformFee || this.incomingTransaction.platformFee > 0) {
      // Generate platform fee transactions
      platformFeeTransaction = new PlatformFeeTransactions(this.incomingTransaction);
      await platformFeeTransaction.setTransactionInfo();
    }
    return platformFeeTransaction;
  }

  async setProviderFeeTransactions() {
    let providerFeeTransaction = null;
    const fromWalletProvider = await Provider.findById(this.incomingTransaction.fromWallet.ProviderId);
    if (fromWalletProvider.fixedFee || fromWalletProvider.percentFee) {
      // Generate Wallet Fees Transactions
      this.incomingTransaction.fromWalletProvider = fromWalletProvider;
      // this.incomingTransaction.fromWallet = fromWallet;
      providerFeeTransaction = new WalletProviderFeeTransactions(this.incomingTransaction);
      await providerFeeTransaction.setTransactionInfo();
    }
    return providerFeeTransaction;
  }

  getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction) {
    let netTransactionAmount = this.incomingTransaction.amount;
    if (paymentProviderFeeTransactions) {
      netTransactionAmount -= paymentProviderFeeTransactions.getTotalFee();
    }
    if (platformFeeTransaction) {
      netTransactionAmount -= platformFeeTransaction.getTotalFee();
    }
    if (providerFeeTransaction) {
      netTransactionAmount -= providerFeeTransaction.getTotalFee();
    }
    return netTransactionAmount;
  }

  async getAllTransactionsWithFee(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction) {
    let transactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    // incrementing transaction groupSequence according to the length of the array
    this.incomingTransaction.transactionGroupSequence = transactions.length;
    if (paymentProviderFeeTransactions) {
      // Add Payment Provider Fee transactions to transactions array
      transactions = transactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());
      // Increment transaction group sequence
      this.incomingTransaction.transactionGroupSequence = transactions.length;
    }
    if (platformFeeTransaction) {
      // Add Platform Fee transactions to transactions array
      transactions = transactions.concat(platformFeeTransaction.getFeeDoubleEntryTransactions());
      // Increment transaction group sequence
      this.incomingTransaction.transactionGroupSequence = transactions.length;
    }
    if (providerFeeTransaction) {
      // Add Wallet Provider Fee transactions to transactions array
    transactions = transactions.concat(providerFeeTransaction.getFeeDoubleEntryTransactions());
    }
    return transactions;
  }

  async getTransactions() {
    // get balance through the field FromWalletId
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If the wallet balance has enough money to do the transaction, then creates just a zero-fee transaction
    if ( fromWalletBalance >= this.incomingTransaction.amount) {
      return this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    }
    // PaymentProvider fee transactions -> Check whether payment provider has fees(> 0) and a wallet id defined
    const paymentProviderFeeTransactions = await this.setPaymentProviderFeeTransactions();
    // Plaftorm fee transactions -> Check whether Platform fee is > 0
    const platformFeeTransaction = await this.setPlatformFeeTransactions();
    // if Wallet Provider has any fee, then create transactions
    const providerFeeTransaction = await this.setProviderFeeTransactions();

    // calculating netAmount of the regular transaction
    this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction);
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee(paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction);
  }

}

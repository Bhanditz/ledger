import uuidv4 from 'uuid/v4';
import Wallet from '../models/Wallet';
import PaymentProviderFeeTransactions from '../lib/feeTransactions/paymentProviderFeeTransactions';
import PlatformFeeTransactions from '../lib/feeTransactions/platformFeeTransactions';
import Provider from '../models/Provider';
import WalletProviderFeeTransactions from '../lib/feeTransactions/walletProviderFeeTransactions';
import TransactionLib from '../lib/transactionLib';
import WalletLib from '../lib/walletLib';

export default class AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    this.incomingTransaction = this._checkAndInsertTransactionGroup(incomingTransaction);
    this.incomingTransaction.transactionGroupTotalAmount = this.incomingTransaction.amount;
    this.transactionLib = new TransactionLib();
    this.walletLib = new WalletLib();
  }

  /** Return database formatted transaction extracted through this.incomingTransaction
  **  if it doesn't have, insert them
  * @return {Array} of transactions
  */
  async getTransactions (){}

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

  getAllTransactionsWithFee(initialTransactions, paymentProviderFeeTransactions, platformFeeTransaction, providerFeeTransaction) {
    let transactions = initialTransactions;
    if (paymentProviderFeeTransactions) {
      // Add Payment Provider Fee transactions to transactions array
      transactions = transactions.concat(paymentProviderFeeTransactions.getFeeDoubleEntryTransactions());
    }
    if (platformFeeTransaction) {
      // Add Platform Fee transactions to transactions array
      transactions = transactions.concat(platformFeeTransaction.getFeeDoubleEntryTransactions());
    }
    if (providerFeeTransaction) {
      // Add Wallet Provider Fee transactions to transactions array
    transactions = transactions.concat(providerFeeTransaction.getFeeDoubleEntryTransactions());
    }
    return transactions;
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

  async getFeeTransactions() {
    // PaymentProvider fee transactions -> Check whether payment provider has fees(> 0) and a wallet id defined
    const paymentProviderFeeTransactions = await this.setPaymentProviderFeeTransactions();
    // Plaftorm fee transactions -> Check whether Platform fee is > 0
    const platformFeeTransactions = await this.setPlatformFeeTransactions();
    // if Wallet Provider has any fee, then create transactions
    const providerFeeTransactions = await this.setProviderFeeTransactions();
    return [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions];
  }

  /** Given a transaction, check whether it has a TransactionGroup
  **  if it doesn't have, insert them
  * @param {Object} incomingTransaction - transaction
  * @return {Object} same transaction with TransactionGroup
  */
  _checkAndInsertTransactionGroup(transaction) {
    if (!transaction.transactionGroupId) {
      transaction.transactionGroupId = uuidv4();
    }
    return transaction;
  }

}

import uuidv4 from 'uuid/v4';
import PaymentProviderFeeTransactions from '../lib/feeTransactions/paymentProviderFeeTransactions';
import PlatformFeeTransactions from '../lib/feeTransactions/platformFeeTransactions';
import WalletProviderFeeTransactions from '../lib/feeTransactions/walletProviderFeeTransactions';
import TransactionLib from '../lib/transactionLib';

export default class AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    this.incomingTransaction = this._checkAndInsertTransactionGroup(incomingTransaction);
    this.incomingTransaction.transactionGroupTotalAmount = this.incomingTransaction.amount;
    this.transactionLib = new TransactionLib();
  }

  /** Return database formatted transaction extracted through this.incomingTransaction
  **  if it doesn't have, insert them
  * @return {Array} of transactions
  */
  async getTransactions (){}

  setPlatformFeeTransactions() {
    let platformFeeTransaction = null;
    if (this.incomingTransaction.platformFee && this.incomingTransaction.platformFee > 0) {
      // Generate platform fee transactions
      platformFeeTransaction = new PlatformFeeTransactions(this.incomingTransaction);
      platformFeeTransaction.setTransactionInfo();
    }
    return platformFeeTransaction;
  }

  setPaymentProviderFeeTransactions() {
    let paymentProviderFeeTransactions = null;
    if (this.incomingTransaction.paymentProviderFee && this.incomingTransaction.paymentProviderFee > 0 &&
      this.incomingTransaction.PaymentProviderAccountId && this.incomingTransaction.PaymentProviderWalletId) {
      // find Payment Provider wallet to generate transactions
      paymentProviderFeeTransactions = new PaymentProviderFeeTransactions(this.incomingTransaction);
      paymentProviderFeeTransactions.setTransactionInfo();
    }
    return paymentProviderFeeTransactions;
  }

  setProviderFeeTransactions() {
    let providerFeeTransaction = null;
    if (this.incomingTransaction.walletProviderFee && this.incomingTransaction.walletProviderFee > 0 &&
      this.incomingTransaction.WalletProviderAccountId && this.incomingTransaction.WalletProviderWalletId) {
      providerFeeTransaction = new WalletProviderFeeTransactions(this.incomingTransaction);
      providerFeeTransaction.setTransactionInfo();
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

  getFeeTransactions() {
    // PaymentProvider fee transactions -> Check whether payment provider has fees(> 0) and a wallet id defined
    const paymentProviderFeeTransactions = this.setPaymentProviderFeeTransactions();
    // Plaftorm fee transactions -> Check whether Platform fee is > 0
    const platformFeeTransactions = this.setPlatformFeeTransactions();
    // if Wallet Provider has any fee, then create transactions
    const providerFeeTransactions = this.setProviderFeeTransactions();
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

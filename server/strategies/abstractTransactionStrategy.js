import uuidv4 from 'uuid/v4';
import PaymentProviderFeeTransactions from '../lib/feeTransactions/paymentProviderFeeTransactions';
import PlatformFeeTransactions from '../lib/feeTransactions/platformFeeTransactions';
import WalletProviderFeeTransactions from '../lib/feeTransactions/walletProviderFeeTransactions';
import TransactionLib from '../lib/transactionLib';
import WalletLib from '../lib/walletLib';
import { operationNotAllowed } from '../globals/errors';

export default class AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    this._validateTransaction(incomingTransaction);
    this.incomingTransaction = this._checkAndInsertTransactionGroup(incomingTransaction);
    this.transactionLib = new TransactionLib();
    this.walletLib = new WalletLib();
  }

  /** Return database formatted transaction extracted through this.incomingTransaction
  **  if it doesn't have, insert them
  * @return {Array} of transactions
  */
  async getTransactions (){}

  async findOrCreateWallets() {
    this.incomingTransaction.fromWallet = await this.walletLib
      .findOrCreateCurrencyWallet(this.incomingTransaction.fromWallet);
    this.incomingTransaction.toWallet = await this.walletLib
      .findOrCreateCurrencyWallet(this.incomingTransaction.toWallet);
    this.incomingTransaction.FromWalletId = this.incomingTransaction.fromWallet.id;
    this.incomingTransaction.ToWalletId = this.incomingTransaction.toWallet.id;
  }

  async setPlatformFeeTransactions() {
    let platformFeeTransaction = null;
    if (this.incomingTransaction.platformFee) {
      // finding or creating platform Wallet
      this.incomingTransaction.platformWallet = await this.walletLib.findOrCreateCurrencyWallet({
        name: 'platform',
        currency: null,
        AccountId: 'platform',
        OwnerAccountId: 'platform',
      });
      this.incomingTransaction.PlatformWalletId = this.incomingTransaction.platformWallet.id;
      this.incomingTransaction.PlatformAccountId = this.incomingTransaction.platformWallet.OwnerAccountId;
      // Generate platform fee transactions
      platformFeeTransaction = new PlatformFeeTransactions(this.incomingTransaction);
      platformFeeTransaction.setTransactionInfo();
    }
    return platformFeeTransaction;
  }

  async setPaymentProviderFeeTransactions() {
    let paymentProviderFeeTransactions = null;
    if (this.incomingTransaction.PaymentProviderAccountId && this.incomingTransaction.paymentProviderWallet) {
      // finding or creating Wallet
      this.incomingTransaction.paymentProviderWallet = await this.walletLib
        .findOrCreateCurrencyWallet(this.incomingTransaction.paymentProviderWallet);
      if (this.incomingTransaction.paymentProviderFee) {
        this.incomingTransaction.PaymentProviderWalletId = this.incomingTransaction.paymentProviderWallet.id;
        this.incomingTransaction.PaymentProviderAccountId = this.incomingTransaction.paymentProviderWallet.OwnerAccountId;
        // find Payment Provider wallet to generate transactions
        paymentProviderFeeTransactions = new PaymentProviderFeeTransactions(this.incomingTransaction);
        paymentProviderFeeTransactions.setTransactionInfo();
      }
    }
    return paymentProviderFeeTransactions;
  }

  async setProviderFeeTransactions() {
    let providerFeeTransaction = null;
    if (this.incomingTransaction.walletProviderFee && this.incomingTransaction.WalletProviderAccountId
      && this.incomingTransaction.walletProviderWallet) {
      // finding or creating Wallet
      this.incomingTransaction.walletProviderWallet = await this.walletLib
        .findOrCreateCurrencyWallet(this.incomingTransaction.walletProviderWallet);
      this.incomingTransaction.WalletProviderWalletId = this.incomingTransaction.walletProviderWallet.id;
      this.incomingTransaction.WalletProviderAccountId = this.incomingTransaction.walletProviderWallet.OwnerAccountId;
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

  async getFeeTransactions() {
    const paymentProviderFeeTransactions = await this.setPaymentProviderFeeTransactions();
    const platformFeeTransactions = await this.setPlatformFeeTransactions();
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

  _validateTransaction(transaction) {
    if (!transaction.FromAccountId) {
      throw Error(operationNotAllowed('field FromAccountId missing'));
    }
    if (!transaction.ToAccountId) {
      throw Error(operationNotAllowed('field ToAccountId missing'));
    }
    if (!transaction.fromWallet) {
      throw Error(operationNotAllowed('field fromWallet missing'));
    }
    if (!transaction.toWallet) {
      throw Error(operationNotAllowed('field toWallet missing'));
    }

  }

}

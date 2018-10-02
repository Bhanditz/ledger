import Wallet from '../models/Wallet';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import ForexConversionTransactions from '../lib/forexConversionTransactions';

export default class TransactionForexStrategy extends AbstractTransactionForexStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async _getDestinationCurrencyFromWalletTransactions(fromWallet) {
    return Wallet.findOrCreate({
      temporary: true,
      currency: this.incomingTransaction.destinationCurrency,
      OwnerAccountId: fromWallet.OwnerAccountId,
      name: `temp_${this.incomingTransaction.destinationCurrency}_${fromWallet.OwnerAccountId}`,
    });
  }

  async getTransactionsRegular() {
    // get balance through the field FromWalletId
    const fromWalletBalance = await this.walletLib.getCurrencyBalanceFromWalletId(this.incomingTransaction.currency, this.incomingTransaction.FromWalletId);
    // If the wallet balance has enough money to do the transaction, then creates just a zero-fee transaction
    if ( fromWalletBalance >= this.incomingTransaction.amount) {
      return this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    }
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    // calculating netAmount of the regular transaction
    this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    // create initial transactions after having a net amount(total amount - fees)
    const initialTransactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee(initialTransactions, paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
  }

  async getTransactions() {
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    this.incomingTransaction.fromWalletDestinationCurrency = await this._getDestinationCurrencyFromWalletTransactions(fromWallet);
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    const conversionTransactionsManager = new ForexConversionTransactions(this.incomingTransaction);
    const conversionTransactions = conversionTransactionsManager.getForexDoubleEntryTransactions();
    // Increment transaction group sequence
    this.incomingTransaction.transactionGroupSequence = conversionTransactions.length;
    // calculating netAmount of the forex transaction
    this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    // modifyinf incomingTransaction so we can use the new information to generate the forex initial transaction
    this.incomingTransaction.FromWalletId = this.incomingTransaction.fromWalletDestinationCurrency.id;
    this.incomingTransaction.currency = this.incomingTransaction.destinationCurrency;
    // setting initial destination currency transaction after having a net amount(total amount - fees)
    const initialDestinationCurrencyTransactions =  this.transactionLib.getDoubleEntryArray(this.incomingTransaction);
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee([...conversionTransactions, ...initialDestinationCurrencyTransactions],
      paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
  }

}

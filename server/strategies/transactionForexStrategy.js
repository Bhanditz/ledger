import Wallet from '../models/Wallet';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import ForexConversionTransactions from '../lib/forexConversionTransactions';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';
import WalletLib from '../lib/walletLib';

export default class TransactionForexStrategy extends AbstractTransactionForexStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async getTransactions() {
    const walletLib = new WalletLib();
    // finding or creating from and to Wallets
    const fromWallet = await walletLib.findOrCreateCurrencyWallet(
      this.incomingTransaction.FromWalletId,
      this.incomingTransaction.currency,
      this.incomingTransaction.FromAccountId
    );
    const toWallet = await walletLib.findOrCreateCurrencyWallet(
      this.incomingTransaction.ToWalletId,
      this.incomingTransaction.destinationCurrency,
      this.incomingTransaction.ToAccountId
    );
    this.incomingTransaction.ToWalletId = toWallet.id;
    this.incomingTransaction.FromWalletId = fromWallet.id;
    this.incomingTransaction.fromWalletDestinationCurrency = await walletLib.findOrCreateTemporaryCurrencyWallet(
      this.incomingTransaction.destinationCurrency,
      fromWallet.OwnerAccountId,
      true
    );
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = this.getFeeTransactions();
    const conversionTransactionsManager = new ForexConversionTransactions(this.incomingTransaction);
    const conversionTransactions = conversionTransactionsManager.getForexDoubleEntryTransactions()
    .map(transaction => {
      transaction.category = transactionCategoryEnum.CURRENCY_CONVERSION;
      return transaction;
    });
    // after calculating all fees, set the amount of transaction as the destinationAmount
    this.incomingTransaction.amount = this.incomingTransaction.destinationAmount;
    // if senderPayFees, he will discount the fees from the total amount to send the net amount to the receiver
    // otherwise the sender will send the full amount and the receiver will pay the fees
    if (this.incomingTransaction.senderPayFees) {
      // calculating netAmount of the regular transaction
      this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    }
    // modifying incomingTransaction so we can use the new information to generate the forex initial transaction
    this.incomingTransaction.FromWalletId = this.incomingTransaction.fromWalletDestinationCurrency.id;
    this.incomingTransaction.currency = this.incomingTransaction.destinationCurrency;
    // setting initial destination currency transaction after having a net amount(total amount - fees)
    const initialDestinationCurrencyTransactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction)
    .map(transaction => {
      transaction.category = transactionCategoryEnum.ACCOUNT;
      return transaction;
    });
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee([...conversionTransactions, ...initialDestinationCurrencyTransactions],
      paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
  }

}

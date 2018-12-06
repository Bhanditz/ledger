import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import ForexConversionTransactions from '../lib/forexConversionTransactions';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';

export default class TransactionForexSenderConvertStrategy extends AbstractTransactionForexStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async getTransactions() { // getTransactionsWithToAccountConvertingCurrency
    await this.findOrCreateWallets(true);
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
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

import Wallet from '../models/Wallet';
import AbstractTransactionForexStrategy from './abstractTransactionForexStrategy';
import ForexConversionTransactions from '../lib/forexConversionTransactions';
import { transactionCategoryEnum } from '../globals/enums/transactionCategoryEnum';

export default class TransactionForexStrategy extends AbstractTransactionForexStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async _getDestinationCurrencyFromWalletTransactions(fromWallet) {
    // findOrCreate returns an array, we should always only get the first.
    return Wallet.findOrCreate({
      where: {
        temporary: true,
        currency: this.incomingTransaction.destinationCurrency,
        OwnerAccountId: fromWallet.OwnerAccountId,
        name: `temp_${this.incomingTransaction.destinationCurrency}_${fromWallet.OwnerAccountId}`,
      },
    }).spread((result) => {
      // console.log(`temp wallet: ${JSON.stringify(result, null, 2)}`);
      return result;
    });
  }

  async getTransactions() {
    const fromWallet = await Wallet.findById(this.incomingTransaction.FromWalletId);
    this.incomingTransaction.fromWalletDestinationCurrency = await this._getDestinationCurrencyFromWalletTransactions(fromWallet);
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    const conversionTransactionsManager = new ForexConversionTransactions(this.incomingTransaction);
    const conversionTransactions = conversionTransactionsManager.getForexDoubleEntryTransactions()
    .map(transaction => {
      transaction.category = transactionCategoryEnum.CURRENCY_CONVERSION;
      return transaction;
    });
    // calculating netAmount of the forex transaction
    this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
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

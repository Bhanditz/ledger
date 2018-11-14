import AbstractTransactionStrategy from './abstractTransactionStrategy';
import transactionCategoryEnum from '../globals/enums/transactionCategoryEnum';

export default class TransactionRegularStrategy extends AbstractTransactionStrategy {

  constructor(incomingTransaction) {
    super(incomingTransaction);
  }

  async getTransactions() {
    await this.findOrCreateWallets();
    const [paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions] = await this.getFeeTransactions();
    // if senderPayFees, he will discount the fees from the total amount to send the net amount to the receiver
    // otherwise the sender will send the full amount and the receiver will pay the fees
    if (this.incomingTransaction.senderPayFees) {
      this.incomingTransaction.amount = this.getTransactionNetAmount(paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
    }
    // create initial transactions after having a net amount(total amount - fees)
    const initialTransactions = this.transactionLib.getDoubleEntryArray(this.incomingTransaction)
    .map(transaction => {
      transaction.category = transactionCategoryEnum.ACCOUNT;
      return transaction;
    });
    // generate all Double Entry transactions
    return this.getAllTransactionsWithFee(initialTransactions, paymentProviderFeeTransactions, platformFeeTransactions, providerFeeTransactions);
  }

}

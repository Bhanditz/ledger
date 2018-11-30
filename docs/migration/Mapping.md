# Mapping

This document will try to explain how the creation of wallets and transactions are handled on the ledger. So everytime a new transaction reaches the queue worker(or even a http POST request), being a migration or a new transaction.

The incoming transactions are being parsed inside the [transactionService.parseTransaction](https://github.com/opencollective/ledger/blob/master/server/services/transactionService.js#L129) method.

## Ledger Payload

```js
const ledgerTransaction = {
    FromAccountId: transaction.FromCollectiveId,
    ToAccountId:  transaction.CollectiveId,
    amount: transaction.amount,
    currency: transaction.currency,
    destinationAmount: amountInHostCurrency, 
    destinationCurrency: hostCurrency,
    WalletProviderAccountId: WalletProviderAccountId,
    WalletProviderAccountId: PaymentProviderAccountId,
    walletProviderFee: hostFeeInHostCurrency,
    platformFee: platformFeeInHostCurrency,
    paymentProviderFee: paymentProcessorFeeInHostCurrency,
    LegacyCreditTransactionId: transaction.id,
    LegacyDebitTransactionId: transaction.debitId,
    forexRate: transaction.hostCurrencyFxRate,
    forexRateSourceCoin: transaction.currency,
    forexRateDestinationCoin: transaction.hostCurrency,
    description: transaction.description,
    RefundTransactionId: transaction.RefundTransactionId,
    refundGroupTransactionId: transaction.refundGroupTransactionId,
    SourcePaymentMethodId: transaction.SourcePaymentMethodId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
    toWallet: {
        name: `owner: ${transaction.collectiveHostSlug}, account: ${transaction.collectiveSlug}, ${hostCurrency}`,
        currency: hostCurrency,
        AccountId: transaction.CollectiveId,
        OwnerAccountId: transaction.CollectiveHostId,
    },
    fromWallet: {
        name: '',
        currency: transaction.currency,
        AccountId: transaction.FromCollectiveId,
        PaymentMethodId: transaction.PaymentMethodId || null,
        SourcePaymentMethodId: transaction.SourcePaymentMethodId || null,
        ExpenseId: transaction.ExpenseId || null,
        OrderId: transaction.OrderId || null,
    },
    walletProviderWallet: { // it will only exist if hostFeeInHostCurrency > 0
        name: '',
        currency: null,
        AccountId: AccountId,
        OwnerAccountId: OwnerAccountId,
    },
    paymentProviderWallet: {
        name: '',
        currency: null,
        AccountId: AccountId,
        OwnerAccountId: OwnerAccountId,
    },
};
```

## To Wallet

The creation of the `toWallet` is determined by the following rule:

1. the **currency** field of the Wallet would be transaction **hostCurrency** or, if there is no **hostCurrency** it will then be the field **currency**
2. the **AccountId** field of the Wallet would be the represented by the field **transaction.CollectiveId**
3. the **OwnerAccountId** field of the Wallet will respectively be one of the following:
    1. If the Collective in question has a Host, the OwnerAccountId will be the Collective's host
    2. But if the transaction has a **transaction.HostCollectiveId**, the OwnerAccountId will be replaced by this HostCollectiveId
    3. At this point we would just set the OwnerAccountId field if it's still no set, which means that we can ignore the following rules if there is **transaction.CollectiveHostId** or **transaction.HostCollectiveId**.
        - the OwnerAccountId will be set as the own **transaction.CollectiveId**.
        - BUT **if** there is a **transaction.hostFeeInHostCurrency** we could have the following
            - **if** there is a **transaction.ExpenseId** the OwnerAccountId will be a combination of the Expense.payoutMethod with, if so the paypal email of the user present in that expense: `payment method: ${transaction.expensePayoutMethod},paypal email: ${transaction.expenseUserPaypalEmail}`
            - **else** it means this transaction has a **OrderId**, and it'll lead to the OwnerAccountId being the CollectiveId that's present in that Order: **transaction.orderPaymentMethodCollectiveId**.
4. the **name** field will be a combination of the AccountId, OwnerAccountId and the Wallet Currency;

## From Wallet

The creation of the `fromWallet` is not as trivial as the `toWallet`, because in this case even if the Account has a Host Id it doesn't make sense to add him as the OwnerAccountId of the wallet. Why?
Example:
        Collective Webpack adds a `stripe` credit card as a Payment method(today)/ Wallet(tomorrow). This `stripe` credit card does NOT belong to the host of Webpack, it belongs to Webpack itself.

 Given that, let's go to the fields:

1. the **currency** field of the Wallet would be transaction **transaction.currency**.
2. the **AccountId** field of the Wallet would be the represented by the field **transaction.FromCollectiveId**
3. the **OwnerAccountId** field of the Wallet will respectively be one of the following:
    - **if** there is a **transaction.PaymentMethodId** the OwnerAccountId will be the collective present in that Payment Method: **transaction.orderPaymentMethodCollectiveId**
    - **else if** there is a **transaction.ExpenseId** the OwnerAccountId will be the collective present in that Expense: **transaction.expenseCollectiveId**
    - **else** it means this transaction has a **OrderId**, and we could have 2 cases:
        - **if** the Order has a Payment Method then the OwnerAccountId will be the Collective of this Payment method: **transaction.orderPaymentMethodCollectiveId**
        - **else** if there is none of the above we will go with the **FromCollectiveId** shown in the Order as the OwnerAccountId: **transaction.orderFromCollectiveId**
4. the **name** field will be a combination of the AccountId, OwnerAccountId and the Wallet Currency;


## Wallet Provider

The Wallet provider only be created if the fee **transaction.hostFeeInHostCurrency** is greater than zero.

1. the **currency** field of the Wallet would always be null as Wallet Providers are supposed to have multi-currency wallets.
2. the **AccountId** and **OwnerAccountId** will always be the same and will be represented by the following:
    1. **if** the transaction has a **transaction.HostCollectiveId**, the AccounId and OwnerAccountId will be **HostCollectiveId**
    2. **else** 
        - **if** there is a **transaction.ExpenseId** the OwnerAccountId and AccountId will be the field **transaction.expensePayoutMethod**
        - **else** it means this transaction has a **OrderId**, and it'll lead to the OwnerAccountId and AccountId being the CollectiveId that's present in that Order: **transaction.orderPaymentMethodCollectiveId**.
4. the **name** field will be a combination of the AccountId, OwnerAccountId and the Wallet Currency;

## Payment Provider

1. the **currency** field of the Wallet would always be null as Payment Providers are supposed to have multi-currency wallets.
2. the **AccountId** and **OwnerAccountId** will always be the same and will be represented by the following:
    - **if** there is a **transaction.PaymentMethodId** the OwnerAccountId and AccountId will be the Payment method service: **transaction.paymentMethodService**
    - **else if** there is a **transaction.ExpenseId** the OwnerAccountId and AccountId will be the Expense payout method: **transaction.expensePayoutMethod**
    - **else** it means this transaction has a **OrderId**, and we could have 2 cases:
        - **if** the Order has a Payment Method then the OwnerAccountId and AccountId will be the Payment method service of that order: **transaction.orderPaymentMethodService**
        - **else** if there is none of the above(Really Rare Case) we will go with the combination of the FromCollectiveId and the Order Id: `transaction.orderFromCollectiveId}_${transaction.OrderId`
4. the **name** field will be a combination of the AccountId, OwnerAccountId and the Wallet Currency;


## forex

The ledger is going to recognize a ledger transaction with the following conditions:

1. the fields **destinationAmount** and **destinationCurrency** are present in the payload.
2. the field **destinationCurrency** is different than the field **currency**

## refunds

The ledger understand refunds transaction for:

- Migration: In the migration we will have the field **RefundTransactionId**
- Incoming transaction refunds: in case of "new" transactions we're gonna consider the field **refundTransactionGroupId**. The main reason is that there is not necessarily the same number of records if we compare the original and its refund transactions, so we need to look through the transaction group.
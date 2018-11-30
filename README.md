# Ledger

Core Ledger(Double-Entry System) Requirements AND features.

## Usage

### Local

Make sure you have postgres installed AND create the database `opencollective_ledger_dvl` . You will find all the details ON how to install AND create the necessary permissions ON the [postgres doc](docs/postgres.md).
After having the database created, run :

- `npm install`
- `npm run db:migrate`
- `npm run dev` (to use nodemon) OR `npm run start`

#### Docker

// TO DO


## Tests

You'll need to have Postgres as well as the test db create with the name `opencollective_ledger_test`. You can use the npm script `npm run recreate-test-db`

- `npm install`
- `npm run migrate-test` OR `npm run recreate-test-db && npm run test`

If you want to run just a specific test file, you can use this command:

- `mocha --recursive --exit ./test/output/test/PATH_TO_YOUR_FILE_INSIDE_TEST FOLDER`

## Documentation(REST)

We are using the library [apidoc](https://github.com/apidoc/apidoc) to generate this documentation. it generates a folder `api-docs` that has an `index.html` at its root which can be open to check the current endpoints.

- `npm run doc`


## Database models


### Wallets

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `name` - name of the wallet
- `currency` - currency of the wallet, we may define all possible currencies. // To do: today this field is just a String, we need to define all possible types
- `AccountId` - The account that this wallet belongs to(reference to `Accounts` table which is the current `Collective` table in the `opencollective-api`)
- `OwnerAccountId` - The account that is responsible to handle the wallet, similar to what the hosts represents in the `opencollective-api`(reference to `Accounts` table which is the current `Collective`)
- `temporary` - flag to identify if the Wallet is a "temporary" wallet(which means the wallet is supposed to always act as intermediary ON forex transactions)


### Transactions

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `type` - **Credit** or **Debit**
- `FromAccountId`- The Account responsible for sending the money in the transaction
- `ToAccountId`- The Account responsible for receiving the money in the transaction
- `FromWalletId`- The Wallet of the Account responsible for sending the money in the transaction
- `ToWalletId`- The Wallet of the Account responsible for Receiving the money in the transaction
- `amount`- The NET amount of the transaction
- `currency` - The currency of the transaction
- `doubleEntryGroupId` - The UUID of the double entry pair transaction(for any CREDIT transaction there is a DEBIT transaction, AND we can "find" all the pairs through this field)
- `transactionGroupId` - The UUID the transaction group -> When an account pays another account, there are several use cases AND in all of them we will have more than one transaction at the very least. This field identify all transactions related to one "action of the system"
- `transactionGroupSequence` - The sequence of the transaction regarding its transaction group


## API Endpoints

Run `npm run doc` to see the available endpoints their requirements

### POST /transactions

#### Endpoint Payload

Current Payload
-

- `FromAccountId` - The identification of the Account that's sending money, *String*
- `fromWallet` - Wallet of the FromAccount, *Object*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `ToAccountId` - The identification of the Account that's receiving money, *String*
- `toWallet` - Wallet of the ToAccount, *Object*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `amount` - Amount that's going to be taken FROM the FromWallet, *Number*
- `currency` - currency of the amount field, *String*
- `destinationAmount` - amount used in forex transactions, *Number*, *optional*
- `destinationCurrency` - currency of the destinationAmount field, used in forex transactions, *String*, *optional*
- `platformFee` - the platform fee in cents(if forex transaction, in destinationCurrency), *Number*, *optional*
- `paymentProviderFee` - the payment provider fee in cents(if forex transaction, *Number*, *optional*
- `PaymentProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `paymentProviderWallet` - Wallet of the payment provider, *Object*, *optional*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `walletProviderFee` - the wallet provider fee in cents(if forex transaction), *Number*, *optional*
- `WalletProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `walletProviderWallet` - Wallet of the payment provider, *Object*, *optional*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `senderPayFees` - flag indicating whether the sender will pay fees, *Boolean*, *optional*

Ideal Payload
-

The ideal payload would be replacing the `prefix-Wallet`s Objects in the payload for simples `WalletId`s . That would make the Payload as the following:

- `FromAccountId` - The identification of the Account that's sending money, *String*
- `ToWalletId` - Wallet id of the sender Account, *Number*, *optional*
- `ToAccountId` - The identification of the Account that's receiving money, *String*
- `ToWalletId` - Wallet id of the receiver Account, *Number*, *optional*
- `amount` - Amount that's going to be taken FROM the FromWallet, *Number*
- `currency` - currency of the amount field, *String*
- `destinationAmount` - amount used in forex transactions, *Number*, *optional*
- `destinationCurrency` - currency of the destinationAmount field, used in forex transactions, *String*, *optional*
- `platformFee` - the platform fee in cents(if forex transaction, in destinationCurrency), *Number*, *optional*
- `paymentProviderFee` - the payment provider fee in cents(if forex transaction, *Number*, *optional*
- `PaymentProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `PaymentProviderWalletId` - Wallet id of the payment provider, *Number*, *optional*
- `walletProviderFee` - the wallet provider fee in cents(if forex transaction), *Number*, *optional*
- `WalletProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `WalletProviderWalletId` - Wallet id of the wallet provider, *Number*, *optional*
- `senderPayFees` - flag indicating whether the sender will pay fees, *Boolean*, *optional*


## Transactions Example

### Transaction with zero fees

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. No fees.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD'
}
```    

And the ledger table would be:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet     |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-----------|------|--------|---------------|--------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD|3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |

### Transaction with platform fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet.  platform fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
}
```    

The total record generated ON the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit AND credit) AND 2 more regarding the platform transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|
|1 | DEBIT |    webpack   |  webpack_USD |   Xavier  |Xavier_USD  |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD | 3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |    platform  | platform     |   webpack |webpack_USD | -300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  webpack_USD |  webpack_USD | platform  |platform    |  300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |

### Transaction with Payment Provider, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```    

The total record generated ON the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit AND credit) AND 2 more regarding the payment provider transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|     Xavier   |  Xavier_USD  |  webpack  |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |     Stripe   | creditcard   |  webpack  |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|     webpack  |  webpack_USD |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |

### Transaction with platform AND Payment Provider fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```    

The total record generated ON the ledger regarding this transaction will be 6 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit) AND 2 more regarding the payment provider transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  webpack     |  webpack_USD | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_USD  | webpack   |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  platform    | platform     | webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  webpack     |  webpack_USD | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |  Stripe      | creditcard   | webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  webpack     |  webpack_USD |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |

### Transaction with platform Fees,Payment Provider fees AND Wallet Provider Fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: WWCodeInc, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_USD, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```

The total record generated ON the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit), 2 regarding the payment provider transaction(debit AND credit) AND 2 more regarding the wallet provider transaction(debit AND credit) 

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|----
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  platform    | platform     |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  wwcode      |  wwcode_USD  | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |  Stripe      | creditcard   |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  wwcode      |  wwcode_USD  |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|  wwcode      |  wwcode_USD  | WWCodeInc |WWCodeInc_USD|300   |   USD  | TG_GROUP_1    |DoubleEntry_4 |

### Transaction with platform Fees,Payment Provider fees AND Wallet Provider Fees, Sender Pays fees

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

The total record generated ON the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit), 2 regarding the payment provider transaction(debit AND credit) AND 2 more regarding the wallet provider transaction(debit AND credit) 

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-2100 |   USD  | TG_GROUP_1    |DoubleEntry_1|   
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |2100  |   USD  | TG_GROUP_1    |DoubleEntry_1|   
|3 | DEBIT |  platform    | platform     | Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2|   
|4 | CREDIT|  Xavier      |  Xavier_USD  | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2|   
|5 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3|   
|6 | CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_3|   
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD | Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_4|    
|8 | CREDIT|  Xavier      |  Xavier_USD  | WWCodeInc |WWCodeInc_USD|300   |   USD  | TG_GROUP_1    |DoubleEntry_4|    


### Forex Transaction

#### Xavier Contributes €30(through his EUR Wallet) to WWCode(USD Collective), Receiver Pay Fees(default behaviour)

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  fromWallet: {
    name: Xavier_EUR,
    currency: EUR,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: wwcode_USD,
    currency: USD,
    AccountId: wwcode, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_Inc, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet       |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4500|   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |   platform   | platform     |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|   wwcode     | wwcode_USD   | platform  |platform     | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|10| CREDIT|   wwcode     | wwcode_USD   |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |
|12| CREDIT|   wwcode     | wwcode_USD   |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |

- rows #1 AND #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 AND #4 - **Stripe** sends 45USD(conversion FROM the 30EUR) to **Xavier**
- rows #5 AND #6 - **Xavier** sends 45USD to **wwcode**
- rows #7 AND #8 - **wwcode** pays 1USD of platform fee
- rows #9 AND #10 - **wwcode** pays 1USD of payment provider fee 
- rows #11 AND #12 - **wwcode** pays 1USD of wallet provider fee

#### Xavier Contributes €30(through his EUR Wallet) to WWCodeAtlanta(who's a USD Collective), Sender Pay Fees

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  fromWallet: {
    name: Xavier_EUR,
    currency: EUR,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: wwcode_USD,
    currency: USD,
    AccountId: wwcode, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_Inc, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet       |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4200|   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4200 |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |   platform   | platform     |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|  Xavier      |  Xavier_USD  | platform  |platform     | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|10| CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |
|12| CREDIT|  Xavier      |  Xavier_USD  |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |

- rows #1 AND #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 AND #4 - **Stripe** sends 45USD(conversion FROM the 30EUR) to **Xavier**
- rows #5 AND #6 - **Xavier** sends 42USD to **wwcode**
- rows #7 AND #8 - **Xavier** pays 1USD of platform fee
- rows #9 AND #10 - **Xavier** pays 1USD of payment provider fee 
- rows #11 AND #12 - **Xavier** pays 1USD of wallet provider fee

### 2018-10-19 simple Case Demo

The focus of this demo is to have the Ledger working with a simple case:

1. Choose a host: Open Source Collective 501c6 (Collective id 11004)
2. Choose 2 collectives: Marco Barcellos(Collective id 18520) AND MochaJS (Collective id 58)
3. Migrate AND Insert new data regarding them:
  - Migrate transactions regarding only the host AND the 2 collectives, AND transactions of same currency) 
   coming into the current api, after saving it also store ON the ledger
  - For every new transaction(regarding only the host AND the 2 collectives, AND transactions of same currency) 
   coming into the current api, after saving it also store ON the ledger.   

```sql
SELECT * FROM "Collectives" WHERE id in( 18520, 11004, 58); -- respectively marco(BACKER), Open Source Collective 501c6 (HOST) AND MochaJS(Collective)
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE t."CollectiveId"=58 AND t."FromCollectiveId"=18520 AND t.type='CREDIT'; -- Marco sending money to MochaJs
```

### Mapping query


L
```sql
-- finding forex tx
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE amount != "amountInHostCurrency" AND "HostCollectiveId" IS NOT NULL  ORDER BY  t.id DESC;

-- choosing one of them through TransactionGroup Field
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' AND t.type='CREDIT' AND t."deletedAt" IS NULL;

-- Mapping
 SELECT t."FromCollectiveId" AS "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" AS "FromWallet    ", t."CollectiveId" AS "ToAccountId", t."CollectiveId" || '_Wallet' AS "ToWallet    ", t.amount, t.currency, t."amountInHostCurrency" AS "destinationAmount", t."hostCurrency" AS "destinationCurrency", t."hostFeeInHostCurrency" AS "walletProviderFee", t."HostCollectiveId" AS "WalletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" AS "WalletProviderWallet", t."platformFeeInHostCurrency" AS "platformFee", t."paymentProcessorFeeInHostCurrency" AS "paymentProviderFee", p.service AS "PaymentProviderAccountId", p.service AS "PaymentProviderWallet", t.id AS "LegacyCreditTransactionId" FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' AND t.type='CREDIT';

```

## Current Production Migration cases

This is going to be a list of problems, approaches AND **real** use cases found along the migration.

The current stateful migration is under the `scripts/migration/statefulMigration.js`. It keeps the state through the `LegacyCreditTransactionId` AND `LegacyDebitTransactionId` field stored in the ledger transactions.

you can run the migration by installing [babel-node](https://github.com/babel/babel/tree/master/packages/babel-node) AND running:

- `babel-node scripts/migration/statefulMigration.js`

Ps: you also need to have the [opencollective-api](https://github.com/opencollective/opencollective-api) database locally.

### Logic for the Mapping

If we Consider a simple query(that filters only CREDIT transactions) FROM the current production database:
```sql
SELECT t.*, p.service AS "pmService", p.type AS "pmType" FROM "Transactions" t 
LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id
WHERE t.type='CREDIT';
```

We can map this query to the following ledger transaction endpoint payload:

```js
{
  FromAccountId: transaction.FromCollectiveId, // `${transaction.FromCollectiveId}(${transaction.fromCollectiveName})`,
  fromWallet: {
    name: transaction.PaymentMethodId,
    currency: transaction.hostCurrency,
    AccountId: transaction.FromCollectiveId,
    OwnerAccountId: transaction.pmCollectiveId, // We consider the Owner of the wallet The Owner of the payment method
  },
  ToAccountId:  transaction.CollectiveId, // `${transaction.CollectiveId}(${transaction.collectiveName})`,
  toWallet: {
    name: `${transaction.CollectiveId}_${transaction.HostCollectiveId}`,
    currency: transaction.currency,
    AccountId: transaction.CollectiveId,
    OwnerAccountId: transaction.HostCollectiveId,
  },
  amount: transaction.amountInHostCurrency,
  currency: transaction.hostCurrency,
  destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
  destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
  walletProviderFee: Math.round(-1 * transaction.hostFeeInHostCurrency/transaction.hostCurrencyFxRate),
  WalletProviderAccountId:  transaction.HostCollectiveId, // `${transaction.HostCollectiveId}(${transaction.hostName})`,
  walletProviderWallet: {
    name: transaction.HostCollectiveId,
    currency: null,
    AccountId: transaction.HostCollectiveId,
    OwnerAccountId: transaction.HostCollectiveId,
  },
  platformFee: Math.round(-1 * transaction.platformFeeInHostCurrency/transaction.hostCurrencyFxRate),
  paymentProviderFee: Math.round(-1 * transaction.paymentProcessorFeeInHostCurrency/transaction.hostCurrencyFxRate),
  PaymentProviderAccountId: transaction.pmService, // PaymentMethod.service
  paymentProviderWallet: {
    name: transaction.pmType, // PaymentMethod.type
    currency: null,
    AccountId: transaction.pmService,
    OwnerAccountId: transaction.pmService,
  },
  LegacyCreditTransactionId: transaction.id,
  LegacyDebitTransactionId: transaction.debitId,
}
```

Fields that deserve more attention:

- `fromWallet` - This will be later changed to `FromWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `toWallet` - This will be later changed to `toWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `WalletProviderAccountId` - This will be set to the `HostCollectiveId` of the transaction
- `walletProviderWallet` - This will be later changed to `walletProviderWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `PaymentProviderAccountId` - this will be set as the service of the payment method `service` field(stripe, paypal, opencollective, etc...)
- `paymentProviderwalletProviderWallet` - This will be later changed to `walletProviderWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `walletProviderFee`, `platformFee` AND `paymentProviderFee`
     - The fees are always paid according to the `hostCurrency` field, but the **collective**(from the `CollectiveId` field) will be responsible to pay those fees, so we will be sending the fees(in `hostCurrency`) divided by the `hostCurrencyFxRate` to then obtain the fees in the `currency` field to send to the ledger. 
        - example 1: marco sends 30 USD to webpack(USD collective, USD host). `hostCurrency` is the same as `currency`, `hostCurrencyFxRate` is 1.
        - example 2: marco sends 30 USD to weco(USD collective, EUR host). `hostCurrency`(EUR) is different than `currency`(USD), `hostCurrencyFxRate` will then convert the fees FROM **EUR** to **USD** to send to the ledger. 
     - We will be looking only for CREDIT transactions(DEBIT is just the same transaction but represented as the opposite, due to the double entry system) AND the fees are negatives, so we need to multiply by -1 to send values higher than zero. 
 - `LegacyCreditTransactionId` - current production `Transactions` of type `CREDIT` table id, this will be a temporary field to support the migration period keeping a state of the records that were already saved
 - `LegacyDebitTransactionId` - - current production `Transactions` of type `DEBIT` table id, this will be a temporary field to support the migration period keeping a state of the records that were already saved

### Cases that the migration is not working

1. PaymentMethodId is **NULL**
2. PaymentMethods table has service defined but does NOT have type defined (example: payment method has service **stripe** but its type is **NULL**(instead of for example **creditcard**))
3. FromCollectiveId is **NULL**(first case found in `LegacyCreditTransactionId` **100784**)
4. HostCollectiveId is **NULL** and/or hostCurrency is **NULL**(first case found `LegacyCreditTransactionId` **99531**)
5. WWcodeBerlin example: collective is EUR, host is USD, collective pays the fees but collective pays it in USD even though it's a host

#### 5th case: Collective is EUR, host is USD. Collective pays fees in USD even though it's not a USD Collective

- `WWCodeBerlin` is a **EUR** Collective AND its Host `Women Who Code 501c3` is a **USD** host.
- Backer `Pia` donates 10EUR to `WWCodeBerlin`. 
- the 10EUR are converted to **USD** because the Host of the collective is **USD**.
- the collective `WWCodeBerlin` pays all fees IN **USD** (platform fee 1USD, Payment processor fee 1USD AND Host fee 1USD)
- the collective keeps showing the money as **EUR** because that's its currency.

The current production Transaction table saves the fees in USD. That's not ideal for the Ledger because the `WWCodeBerlin` would have an EUR Wallet. so to make it work we are converting the fees saved in the current prod FROM USD to EUR using the fee `hostCurrencyFxRate` to get the fees in EUR. This may cause small differences due to the round when converting.


## Migration: Comparing Ledger results with current production database

We need to make sure/approve at least one result for each case we find in the current api. We can look for:

- Transactions of same currency. 
    - All currencies showing up in the current prod db
    - With all combinations of Fees(paymentProcessorFee, platformFee AND hostFee), null, not null or 0.
- Forex transactions. 
    - all combinations of currency(field currency different FROM field hostCurrency) showing up in the current prod db
    - With all combinations of Fees(paymentProcessorFee, platformFee AND hostFee)
- Transactions with all combinations of PaymentMethodId(null AND not null), ExpenseId(null AND not null) AND OrderId(null AND not null)

### Checking whether there is a transaction missing(from Current Api to Ledger)

```sql
-- Looking for max AND min Legacy ids
SELECT max("LegacyCreditTransactionId") AS "maxLegacyId", min("LegacyCreditTransactionId") AS "minLegacyId" 
from "LedgerTransactions";

-- in staging november 23: result 65895 rows
SELECT DISTINCT(t.id) FROM "Transactions" t
WHERE t.type='CREDIT' AND t."deletedAt" IS NULL;

-- Looking for transaction ids WHERE LegacyId IS NOT NULL 
-- the result should show ALL ids FROM Transaction same number of
-- rows as query above(in staging november 23: result 65895 rows)
SELECT DISTINCT(t.id), l."LegacyCreditTransactionId"
FROM "Transactions" t
LEFT JOIN "LedgerTransactions" l ON t.id=l."LegacyCreditTransactionId" 
WHERE 
t.type='CREDIT' AND t."deletedAt" IS NULL
AND l."LegacyCreditTransactionId" IS NOT NULL 
ORDER BY t.id ASC;

-- Looking for transaction ids WHERE LegacyId IS NULL
-- the result should return 0 rows if all the rows are present
SELECT DISTINCT(t.id), l."LegacyCreditTransactionId"
FROM "Transactions" t
LEFT JOIN "LedgerTransactions" l ON t.id=l."LegacyCreditTransactionId" 
WHERE 
t.type='CREDIT' AND t."deletedAt" IS NULL
AND l."LegacyCreditTransactionId" IS NULL
ORDER BY  t.id asc;
```

### Transactions of same currency

#### All currencies showing up in the current prod db

In the current prod DB, we need a Query to find all currencies that have both currency AND hostCurrency fields with the same value AND the look for, for example, the first case:

```sql
SELECT distinct(currency) FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL;
SELECT * FROM "Transactions" WHERE currency='GBP' AND "hostCurrency"='GBP' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126856
    SELECT * FROM "Transactions" WHERE id=126856; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126864
    SELECT * FROM "Transactions" WHERE id=126864; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864; 
SELECT * FROM "Transactions" WHERE currency='AUD' AND "hostCurrency"='AUD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 121964
    SELECT * FROM "Transactions" WHERE id=121964; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=121964; 
SELECT * FROM "Transactions" WHERE currency='EUR' AND "hostCurrency"='EUR' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc;  -- id 126808
    SELECT * FROM "Transactions" WHERE id=126808;
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
SELECT * FROM "Transactions" WHERE currency='MXN' AND "hostCurrency"='MXN' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126392
    SELECT * FROM "Transactions" WHERE id=126392; 
	  SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126392; 
```

- GBP

```sql
SELECT * FROM "Transactions" WHERE id=126856; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856; 
```

- USD

```sql
SELECT * FROM "Transactions" WHERE id=126864; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864; 
```

- AUD

```sql
SELECT * FROM "Transactions" WHERE id=121964; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=121964; 
```

- EUR

```sql
SELECT * FROM "Transactions" WHERE id=126808; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
```

- MXN

```sql
SELECT * FROM "Transactions" WHERE id=126392; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126392; 
```

#### All combinations of fees

- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`

```sql
--SAME CURRENCY Txs
-- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126864
    SELECT * FROM "Transactions" WHERE id=126864; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864;
```

- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`

```sql
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 125586
    SELECT * FROM "Transactions" WHERE id=126256; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126256;
```

- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`

```sql
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 108954
    SELECT * FROM "Transactions" WHERE id=108954; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=108954;
```

- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`

```sql
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126856
    SELECT * FROM "Transactions" WHERE id=126856; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856;
```

- With only `hostFeeInHostCurrency`

```sql
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 107266
    SELECT * FROM "Transactions" WHERE id=107266; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=107266;
```

- With only `platformFeeInHostCurrency`

```sql
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 99667
    SELECT * FROM "Transactions" WHERE id=99667; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99667;
```

- With only `paymentProcessorFeeInHostCurrency`

```sql
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 
    SELECT * FROM "Transactions" WHERE id=126766; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126766;
```

- With no fees

```sql
-- With no fees
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126808
    SELECT * FROM "Transactions" WHERE id=126808; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
```

- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)

Case WHERE the Ledger is NOT COMPLIANT at the moment, generating wrong transactions

```sql
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=126592; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126592; 
```

- All Queries used ON the fee combinations:

```sql
--SAME CURRENCY Txs
-- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126864
    SELECT * FROM "Transactions" WHERE id=126864; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864;
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 125586
    SELECT * FROM "Transactions" WHERE id=126256; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126256;
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 108954
    SELECT * FROM "Transactions" WHERE id=108954; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=108954;
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126856
    SELECT * FROM "Transactions" WHERE id=126856; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856;
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 107266
    SELECT * FROM "Transactions" WHERE id=107266; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=107266;
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 99667
    SELECT * FROM "Transactions" WHERE id=99667; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99667;
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 
    SELECT * FROM "Transactions" WHERE id=126766; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126766;
-- With no fees
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126808
    SELECT * FROM "Transactions" WHERE id=126808; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=126592; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126592; 
```

### Forex Transactions

#### All currencies combinations(currency, hostCurrency)

```sql
SELECT distinct(currency, "hostCurrency") FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL;
SELECT * FROM "Transactions" WHERE currency='AUD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 115214
    SELECT * FROM "Transactions" WHERE id=115214; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=115214; 
SELECT * FROM "Transactions" WHERE currency='CAD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 124466
    SELECT * FROM "Transactions" WHERE id=124466; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124466; 
SELECT * FROM "Transactions" WHERE currency='EUR' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 125502
    SELECT * FROM "Transactions" WHERE id=125502; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125502; 
SELECT * FROM "Transactions" WHERE currency='GBP' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126404
    SELECT * FROM "Transactions" WHERE id=126404; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
SELECT * FROM "Transactions" WHERE currency='INR' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 99099
    SELECT * FROM "Transactions" WHERE id=99099; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99099; 
SELECT * FROM "Transactions" WHERE currency='JPY' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 98944
    SELECT * FROM "Transactions" WHERE id=98944; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=98944; 
SELECT * FROM "Transactions" WHERE currency='MXN' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126336
    SELECT * FROM "Transactions" WHERE id=126336; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126336; 
SELECT * FROM "Transactions" WHERE currency='NZD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 116622
    SELECT * FROM "Transactions" WHERE id=116622; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=116622; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='AUD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126292
    SELECT * FROM "Transactions" WHERE id=126292; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126292; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='EUR' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126322
    SELECT * FROM "Transactions" WHERE id=126322; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126322; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='GBP' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126860
    SELECT * FROM "Transactions" WHERE id=126860; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='NZD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 123317
    SELECT * FROM "Transactions" WHERE id=123317; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=123317; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='UYU' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 99519
    SELECT * FROM "Transactions" WHERE id=99519; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99519; 
```

- (AUD,USD)

```sql
SELECT * FROM "Transactions" WHERE id=115214; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=115214; 
```

- (CAD,USD)

```sql
SELECT * FROM "Transactions" WHERE id=124466; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124466; 
```

- (EUR,USD)

```sql
SELECT * FROM "Transactions" WHERE id=125502; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125502; 
```

- (GBP,USD)

```sql
SELECT * FROM "Transactions" WHERE id=126404; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
```

- (INR,USD)

```sql
SELECT * FROM "Transactions" WHERE id=99099; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99099; 
```

- (JPY,USD)

```sql
SELECT * FROM "Transactions" WHERE id=98944; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=98944; 
```

- (MXN,USD)

```sql
SELECT * FROM "Transactions" WHERE id=126336; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126336;
```

- (NZD,USD)

```sql
SELECT * FROM "Transactions" WHERE id=116622; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=116622;
```

- (USD,AUD)

```sql
SELECT * FROM "Transactions" WHERE id=126292; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126292; 
```

- (USD,EUR)

```sql
SELECT * FROM "Transactions" WHERE id=126322; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126322;
```

- (USD,GBP)

```sql
SELECT * FROM "Transactions" WHERE id=126860; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860;
```

- (USD,NZD)

```sql
SELECT * FROM "Transactions" WHERE id=123317; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=123317; 
```

- (USD,UYU)

```sql
SELECT * FROM "Transactions" WHERE id=99519; 
SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99519; 
```

#### All combinations of fees

- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`

Case not found with the following query:

```sql
-- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126482
	SELECT * FROM "Transactions" WHERE id=126482; 
  SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126482;
```

- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`

Case not found with the following query:

```sql
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
```

- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`

Case not found with the following query:

```sql
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
```

- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`

```sql
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126860
    SELECT * FROM "Transactions" WHERE id=126860; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860;
```

- With only `hostFeeInHostCurrency`

```sql
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 125962
    SELECT * FROM "Transactions" WHERE id=125962; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125962;
```

- With only `platformFeeInHostCurrency`

Case not found with the following query:

```sql
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- NO RESULT
```

- With only `paymentProcessorFeeInHostCurrency`

```sql
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id
    SELECT * FROM "Transactions" WHERE id=125552; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125552;
```

- With no fees

```sql
-- With no fees
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126404
    SELECT * FROM "Transactions" WHERE id=126404; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
```

- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)

Case WHERE the Ledger is NOT COMPLIANT at the moment, generating wrong transactions

```sql
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=124964; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124964; 
```

- All Queries used ON the fee combinations:

```sql
-- FOREX Transactions
-- With all fees: `hostFeeInHostCurrency`, `platformFeeInHostCurrency`, `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126482
	SELECT * FROM "Transactions" WHERE id=126482; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126482;
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126860
    SELECT * FROM "Transactions" WHERE id=126860; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860;
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 125962
    SELECT * FROM "Transactions" WHERE id=125962; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125962;
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- NO RESULT
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id
    SELECT * FROM "Transactions" WHERE id=125552; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125552;
-- With no fees
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126404
    SELECT * FROM "Transactions" WHERE id=126404; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=124964; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124964; 
```

### All queries together

```sql

-- Same currency txs
-- all currencies
SELECT distinct(currency) FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL;
SELECT * FROM "Transactions" WHERE currency='GBP' AND "hostCurrency"='GBP' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126856
    SELECT * FROM "Transactions" WHERE id=126856; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126864
    SELECT * FROM "Transactions" WHERE id=126864; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864; 
SELECT * FROM "Transactions" WHERE currency='AUD' AND "hostCurrency"='AUD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 121964
    SELECT * FROM "Transactions" WHERE id=121964; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=121964; 
SELECT * FROM "Transactions" WHERE currency='EUR' AND "hostCurrency"='EUR' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc;  -- id 126808
    SELECT * FROM "Transactions" WHERE id=126808;
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
SELECT * FROM "Transactions" WHERE currency='MXN' AND "hostCurrency"='MXN' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- id 126392
    SELECT * FROM "Transactions" WHERE id=126392; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126392; 

-- Same currency txs
-- all fees combinations
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126864
    SELECT * FROM "Transactions" WHERE id=126864; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126864;
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 125586
    SELECT * FROM "Transactions" WHERE id=126256; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126256;
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 108954
    SELECT * FROM "Transactions" WHERE id=108954; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=108954;
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126856
    SELECT * FROM "Transactions" WHERE id=126856; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126856;
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 107266
    SELECT * FROM "Transactions" WHERE id=107266; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=107266;
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 99667
    SELECT * FROM "Transactions" WHERE id=99667; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99667;
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 
    SELECT * FROM "Transactions" WHERE id=126766; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126766;
-- With no fees
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126808
    SELECT * FROM "Transactions" WHERE id=126808; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126808; 
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=126592; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126592; 

-- Forex transactions
-- all currencies combinations
SELECT distinct(currency, "hostCurrency") FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL;
SELECT * FROM "Transactions" WHERE currency='AUD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 115214
    SELECT * FROM "Transactions" WHERE id=115214; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=115214; 
SELECT * FROM "Transactions" WHERE currency='CAD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 124466
    SELECT * FROM "Transactions" WHERE id=124466; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124466; 
SELECT * FROM "Transactions" WHERE currency='EUR' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 125502
    SELECT * FROM "Transactions" WHERE id=125502; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125502; 
SELECT * FROM "Transactions" WHERE currency='GBP' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126404
    SELECT * FROM "Transactions" WHERE id=126404; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
SELECT * FROM "Transactions" WHERE currency='INR' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 99099
    SELECT * FROM "Transactions" WHERE id=99099; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99099; 
SELECT * FROM "Transactions" WHERE currency='JPY' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 98944
    SELECT * FROM "Transactions" WHERE id=98944; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=98944; 
SELECT * FROM "Transactions" WHERE currency='MXN' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126336
    SELECT * FROM "Transactions" WHERE id=126336; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126336; 
SELECT * FROM "Transactions" WHERE currency='NZD' AND "hostCurrency"='USD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 116622
    SELECT * FROM "Transactions" WHERE id=116622; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=116622; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='AUD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126292
    SELECT * FROM "Transactions" WHERE id=126292; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126292; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='EUR' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126322
    SELECT * FROM "Transactions" WHERE id=126322; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126322; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='GBP' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 126860
    SELECT * FROM "Transactions" WHERE id=126860; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='NZD' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 123317
    SELECT * FROM "Transactions" WHERE id=123317; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=123317; 
SELECT * FROM "Transactions" WHERE currency='USD' AND "hostCurrency"='UYU' AND type='CREDIT' AND "deletedAt" IS NULL ORDER BY  id desc; -- first id that this kind of transaction shows up: 99519
    SELECT * FROM "Transactions" WHERE id=99519; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=99519; 


-- Forex transactions
-- all fees combinations
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- first id 126482
  SELECT * FROM "Transactions" WHERE id=126482; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126482;
-- With only `hostFeeInHostCurrency` AND `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
-- With only `hostFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency"=0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc; -- NO RESULT
-- With only `platformFeeInHostCurrency` AND `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency" < 0 AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126860
    SELECT * FROM "Transactions" WHERE id=126860; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126860;
-- With only `hostFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND "hostFeeInHostCurrency" < 0  ORDER BY  id desc;  -- first id 125962
    SELECT * FROM "Transactions" WHERE id=125962; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125962;
-- With only `platformFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency"=0) AND "platformFeeInHostCurrency" < 0 AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- NO RESULT
-- With only `paymentProcessorFeeInHostCurrency`
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND "paymentProcessorFeeInHostCurrency"< 0 AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id
    SELECT * FROM "Transactions" WHERE id=125552; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=125552;
-- With no fees
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" IS NULL or "paymentProcessorFeeInHostCurrency" = 0) AND ("platformFeeInHostCurrency" IS NULL or "platformFeeInHostCurrency" = 0) AND ("hostFeeInHostCurrency" IS NULL or "hostFeeInHostCurrency" = 0)  ORDER BY  id desc; -- first id 126404
    SELECT * FROM "Transactions" WHERE id=126404; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=126404; 
-- With Positive fees(fees are usually negative but they can be positive in some cases like refunds)
SELECT * FROM "Transactions" WHERE currency!="hostCurrency" AND type='CREDIT' AND "deletedAt" IS NULL AND ("paymentProcessorFeeInHostCurrency" > 0 or "platformFeeInHostCurrency" > 0 or "hostFeeInHostCurrency" > 0)  ORDER BY  id desc; -- first id 124964
    SELECT * FROM "Transactions" WHERE id=124964; 
    SELECT * FROM "LedgerTransactions" WHERE "LegacyCreditTransactionId"=124964; 

```


### Wallets

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `name` - name of the wallet
- `currency` - currency of the wallet, we may define all possible currencies. // To do: today this field is just a String, we need to define all possible types
- `AccountId` - The account that this wallet belongs to(reference to `Accounts` table which is the current `Collective` table in the `opencollective-api`)
- `OwnerAccountId` - The account that is responsible to handle the wallet, similar to what the hosts represents in the `opencollective-api`(reference to `Accounts` table which is the current `Collective`)
- `temporary` - flag to identify if the Wallet is a "temporary" wallet(which means the wallet is supposed to always act as intermediary ON forex transactions)


### Transactions

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `type` - **Credit** or **Debit**
- `FromAccountId`- The Account responsible for sending the money in the transaction
- `ToAccountId`- The Account responsible for receiving the money in the transaction
- `FromWalletId`- The Wallet of the Account responsible for sending the money in the transaction
- `ToWalletId`- The Wallet of the Account responsible for Receiving the money in the transaction
- `amount`- The NET amount of the transaction
- `currency` - The currency of the transaction
- `doubleEntryGroupId` - The UUID of the double entry pair transaction(for any CREDIT transaction there is a DEBIT transaction, AND we can "find" all the pairs through this field)
- `transactionGroupId` - The UUID the transaction group -> When an account pays another account, there are several use cases AND in all of them we will have more than one transaction at the very least. This field identify all transactions related to one "action of the system"
- `transactionGroupSequence` - The sequence of the transaction regarding its transaction group


## API Endpoints

Run `npm run doc` to see the available endpoints their requirements

### POST /transactions

#### Endpoint Payload

Current Payload
-

- `FromAccountId` - The identification of the Account that's sending money, *String*
- `fromWallet` - Wallet of the FromAccount, *Object*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `ToAccountId` - The identification of the Account that's receiving money, *String*
- `toWallet` - Wallet of the ToAccount, *Object*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `amount` - Amount that's going to be taken FROM the FromWallet, *Number*
- `currency` - currency of the amount field, *String*
- `destinationAmount` - amount used in forex transactions, *Number*, *optional*
- `destinationCurrency` - currency of the destinationAmount field, used in forex transactions, *String*, *optional*
- `platformFee` - the platform fee in cents(if forex transaction, in destinationCurrency), *Number*, *optional*
- `paymentProviderFee` - the payment provider fee in cents(if forex transaction, *Number*, *optional*
- `PaymentProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `paymentProviderWallet` - Wallet of the payment provider, *Object*, *optional*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `walletProviderFee` - the wallet provider fee in cents(if forex transaction), *Number*, *optional*
- `WalletProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `walletProviderWallet` - Wallet of the payment provider, *Object*, *optional*
  - *name* - name of the wallet
  - *currency* - currency of the wallet
  - *AccountId* - AccountId that this wallet belongs to(reference to the `Collective` model of `opencollective-api`)
  - *OwnerAccountId* - AccountId responsible to manage this Wallet
- `senderPayFees` - flag indicating whether the sender will pay fees, *Boolean*, *optional*

Ideal Payload
-

The ideal payload would be replacing the `prefix-Wallet`s Objects in the payload for simples `WalletId`s . That would make the Payload as the following:

- `FromAccountId` - The identification of the Account that's sending money, *String*
- `ToWalletId` - Wallet id of the sender Account, *Number*, *optional*
- `ToAccountId` - The identification of the Account that's receiving money, *String*
- `ToWalletId` - Wallet id of the receiver Account, *Number*, *optional*
- `amount` - Amount that's going to be taken FROM the FromWallet, *Number*
- `currency` - currency of the amount field, *String*
- `destinationAmount` - amount used in forex transactions, *Number*, *optional*
- `destinationCurrency` - currency of the destinationAmount field, used in forex transactions, *String*, *optional*
- `platformFee` - the platform fee in cents(if forex transaction, in destinationCurrency), *Number*, *optional*
- `paymentProviderFee` - the payment provider fee in cents(if forex transaction, *Number*, *optional*
- `PaymentProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `PaymentProviderWalletId` - Wallet id of the payment provider, *Number*, *optional*
- `walletProviderFee` - the wallet provider fee in cents(if forex transaction), *Number*, *optional*
- `WalletProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `WalletProviderWalletId` - Wallet id of the wallet provider, *Number*, *optional*
- `senderPayFees` - flag indicating whether the sender will pay fees, *Boolean*, *optional*


## Transactions Example

### Transaction with zero fees

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. No fees.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD'
}
```    

And the ledger table would be:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet     |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-----------|------|--------|---------------|--------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD|3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |

### Transaction with platform fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet.  platform fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
}
```    

The total record generated ON the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit AND credit) AND 2 more regarding the platform transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|
|1 | DEBIT |    webpack   |  webpack_USD |   Xavier  |Xavier_USD  |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD | 3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |    platform  | platform     |   webpack |webpack_USD | -300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  webpack_USD |  webpack_USD | platform  |platform    |  300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |

### Transaction with Payment Provider, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```    

The total record generated ON the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit AND credit) AND 2 more regarding the payment provider transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|     Xavier   |  Xavier_USD  |  webpack  |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |     Stripe   | creditcard   |  webpack  |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|     webpack  |  webpack_USD |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |

### Transaction with platform AND Payment Provider fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```    

The total record generated ON the ledger regarding this transaction will be 6 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit) AND 2 more regarding the payment provider transaction(debit AND credit)

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  webpack     |  webpack_USD | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_USD  | webpack   |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  platform    | platform     | webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  webpack     |  webpack_USD | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |  Stripe      | creditcard   | webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  webpack     |  webpack_USD |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |

### Transaction with platform Fees,Payment Provider fees AND Wallet Provider Fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: WWCodeInc, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_USD, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  }
}
```

The total record generated ON the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit), 2 regarding the payment provider transaction(debit AND credit) AND 2 more regarding the wallet provider transaction(debit AND credit) 

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|----
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  platform    | platform     |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  wwcode      |  wwcode_USD  | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |  Stripe      | creditcard   |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  wwcode      |  wwcode_USD  |  Stripe   |creditcard   |300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|  wwcode      |  wwcode_USD  | WWCodeInc |WWCodeInc_USD|300   |   USD  | TG_GROUP_1    |DoubleEntry_4 |

### Transaction with platform Fees,Payment Provider fees AND Wallet Provider Fees, Sender Pays fees

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  fromWallet: {
    name: Xavier_USD,
    currency: USD,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: webpack_USD,
    currency: USD,
    AccountId: webpack, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

The total record generated ON the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit AND credit), 2 regarding the platform transaction(debit AND credit), 2 regarding the payment provider transaction(debit AND credit) AND 2 more regarding the wallet provider transaction(debit AND credit) 

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet      |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-2100 |   USD  | TG_GROUP_1    |DoubleEntry_1|   
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |2100  |   USD  | TG_GROUP_1    |DoubleEntry_1|   
|3 | DEBIT |  platform    | platform     | Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2|   
|4 | CREDIT|  Xavier      |  Xavier_USD  | platform  |platform     |300   |   USD  | TG_GROUP_1    |DoubleEntry_2|   
|5 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3|   
|6 | CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_3|   
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD | Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_4|    
|8 | CREDIT|  Xavier      |  Xavier_USD  | WWCodeInc |WWCodeInc_USD|300   |   USD  | TG_GROUP_1    |DoubleEntry_4|    


### Forex Transaction

#### Xavier Contributes €30(through his EUR Wallet) to WWCode(USD Collective), Receiver Pay Fees(default behaviour)

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  fromWallet: {
    name: Xavier_EUR,
    currency: EUR,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: wwcode_USD,
    currency: USD,
    AccountId: wwcode, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_Inc, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet       |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4500|   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |   platform   | platform     |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|   wwcode     | wwcode_USD   | platform  |platform     | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|10| CREDIT|   wwcode     | wwcode_USD   |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |
|12| CREDIT|   wwcode     | wwcode_USD   |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |

- rows #1 AND #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 AND #4 - **Stripe** sends 45USD(conversion FROM the 30EUR) to **Xavier**
- rows #5 AND #6 - **Xavier** sends 45USD to **wwcode**
- rows #7 AND #8 - **wwcode** pays 1USD of platform fee
- rows #9 AND #10 - **wwcode** pays 1USD of payment provider fee 
- rows #11 AND #12 - **wwcode** pays 1USD of wallet provider fee

#### Xavier Contributes €30(through his EUR Wallet) to WWCodeAtlanta(who's a USD Collective), Sender Pay Fees

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  fromWallet: {
    name: Xavier_EUR,
    currency: EUR,
    AccountId: Xavier, // The Account that this wallet will belong to
    OwnerAccountId: OpenCollective, // Represents the Host in the current opencollective-api
  },
  toWallet: {
    name: wwcode_USD,
    currency: USD,
    AccountId: wwcode, // The Account that this wallet will belong to
    OwnerAccountId: wwcode_Inc, // Represents the Host in the current opencollective-api
  },
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  walletProviderWallet: {
    name: collective,
    AccountId: opencollective, // The Account that this wallet will belong to
    OwnerAccountId: opencollective, // Represents the Host in the current opencollective-api
  }
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWallet: {
    name: creditcard,
    AccountId: stripe, // The Account that this wallet will belong to
    OwnerAccountId: stripe, // Represents the Host in the current opencollective-api
  },
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWallet     |ToAccountId|ToWallet       |amount|currency|TransactioGroup|DoubleEntryId |
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4200|   USD  | TG_GROUP_1    |DoubleEntry_3 |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4200 |   USD  | TG_GROUP_1    |DoubleEntry_3 |
|7 | DEBIT |   platform   | platform     |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|8 | CREDIT|  Xavier      |  Xavier_USD  | platform  |platform     | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|10| CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |
|12| CREDIT|  Xavier      |  Xavier_USD  |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |

- rows #1 AND #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 AND #4 - **Stripe** sends 45USD(conversion FROM the 30EUR) to **Xavier**
- rows #5 AND #6 - **Xavier** sends 42USD to **wwcode**
- rows #7 AND #8 - **Xavier** pays 1USD of platform fee
- rows #9 AND #10 - **Xavier** pays 1USD of payment provider fee 
- rows #11 AND #12 - **Xavier** pays 1USD of wallet provider fee

### 2018-10-19 simple Case Demo

The focus of this demo is to have the Ledger working with a simple case:

1. Choose a host: Open Source Collective 501c6 (Collective id 11004)
2. Choose 2 collectives: Marco Barcellos(Collective id 18520) AND MochaJS (Collective id 58)
3. Migrate AND Insert new data regarding them:
  - Migrate transactions regarding only the host AND the 2 collectives, AND transactions of same currency) 
   coming into the current api, after saving it also store ON the ledger
  - For every new transaction(regarding only the host AND the 2 collectives, AND transactions of same currency) 
   coming into the current api, after saving it also store ON the ledger.   

```sql
SELECT * FROM "Collectives" WHERE id in( 18520, 11004, 58); -- respectively marco(BACKER), Open Source Collective 501c6 (HOST) AND MochaJS(Collective)
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE t."CollectiveId"=58 AND t."FromCollectiveId"=18520 AND t.type='CREDIT'; -- Marco sending money to MochaJs
```

### Mapping query


L
```sql
-- finding forex tx
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE amount != "amountInHostCurrency" AND "HostCollectiveId" IS NOT NULL  ORDER BY  t.id DESC;

-- choosing one of them through TransactionGroup Field
SELECT * FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' AND t.type='CREDIT' AND t."deletedAt" IS NULL;

-- Mapping
 SELECT t."FromCollectiveId" AS "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" AS "FromWallet    ", t."CollectiveId" AS "ToAccountId", t."CollectiveId" || '_Wallet' AS "ToWallet    ", t.amount, t.currency, t."amountInHostCurrency" AS "destinationAmount", t."hostCurrency" AS "destinationCurrency", t."hostFeeInHostCurrency" AS "walletProviderFee", t."HostCollectiveId" AS "WalletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" AS "WalletProviderWallet", t."platformFeeInHostCurrency" AS "platformFee", t."paymentProcessorFeeInHostCurrency" AS "paymentProviderFee", p.service AS "PaymentProviderAccountId", p.service AS "PaymentProviderWallet", t.id AS "LegacyCreditTransactionId" FROM "Transactions" t LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' AND t.type='CREDIT';

```

## Current Production Migration cases

This is going to be a list of problems, approaches AND **real** use cases found along the migration.

The current stateful migration is under the `scripts/migration/statefulMigration.js`. It keeps the state through the `LegacyCreditTransactionId` AND `LegacyDebitTransactionId` field stored in the ledger transactions.

you can run the migration by installing [babel-node](https://github.com/babel/babel/tree/master/packages/babel-node) AND running:

- `babel-node scripts/migration/statefulMigration.js`

Ps: you also need to have the [opencollective-api](https://github.com/opencollective/opencollective-api) database locally.

### Logic for the Mapping

If we Consider a simple query(that filters only CREDIT transactions) FROM the current production database:
```sql
SELECT t.*, p.service AS "pmService", p.type AS "pmType" FROM "Transactions" t 
LEFT JOIN "PaymentMethods" p ON t."PaymentMethodId"=p.id
WHERE t.type='CREDIT';
```

We can map this query to the following ledger transaction endpoint payload:

```js
{
  FromAccountId: transaction.FromCollectiveId, // `${transaction.FromCollectiveId}(${transaction.fromCollectiveName})`,
  fromWallet: {
    name: transaction.PaymentMethodId,
    currency: transaction.hostCurrency,
    AccountId: transaction.FromCollectiveId,
    OwnerAccountId: transaction.pmCollectiveId, // We consider the Owner of the wallet The Owner of the payment method
  },
  ToAccountId:  transaction.CollectiveId, // `${transaction.CollectiveId}(${transaction.collectiveName})`,
  toWallet: {
    name: `${transaction.CollectiveId}_${transaction.HostCollectiveId}`,
    currency: transaction.currency,
    AccountId: transaction.CollectiveId,
    OwnerAccountId: transaction.HostCollectiveId,
  },
  amount: transaction.amountInHostCurrency,
  currency: transaction.hostCurrency,
  destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
  destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
  walletProviderFee: Math.round(-1 * transaction.hostFeeInHostCurrency/transaction.hostCurrencyFxRate),
  WalletProviderAccountId:  transaction.HostCollectiveId, // `${transaction.HostCollectiveId}(${transaction.hostName})`,
  walletProviderWallet: {
    name: transaction.HostCollectiveId,
    currency: null,
    AccountId: transaction.HostCollectiveId,
    OwnerAccountId: transaction.HostCollectiveId,
  },
  platformFee: Math.round(-1 * transaction.platformFeeInHostCurrency/transaction.hostCurrencyFxRate),
  paymentProviderFee: Math.round(-1 * transaction.paymentProcessorFeeInHostCurrency/transaction.hostCurrencyFxRate),
  PaymentProviderAccountId: transaction.pmService, // PaymentMethod.service
  paymentProviderWallet: {
    name: transaction.pmType, // PaymentMethod.type
    currency: null,
    AccountId: transaction.pmService,
    OwnerAccountId: transaction.pmService,
  },
  LegacyCreditTransactionId: transaction.id,
  LegacyDebitTransactionId: transaction.debitId,
}
```

Fields that deserve more attention:

- `fromWallet` - This will be later changed to `FromWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `toWallet` - This will be later changed to `toWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `WalletProviderAccountId` - This will be set to the `HostCollectiveId` of the transaction
- `walletProviderWallet` - This will be later changed to `walletProviderWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `PaymentProviderAccountId` - this will be set as the service of the payment method `service` field(stripe, paypal, opencollective, etc...)
- `paymentProviderwalletProviderWallet` - This will be later changed to `walletProviderWalletId` which will simply refer to an existing wallet in the ledger, for now an object is required
- `walletProviderFee`, `platformFee` AND `paymentProviderFee`
     - The fees are always paid according to the `hostCurrency` field, but the **collective**(from the `CollectiveId` field) will be responsible to pay those fees, so we will be sending the fees(in `hostCurrency`) divided by the `hostCurrencyFxRate` to then obtain the fees in the `currency` field to send to the ledger. 
        - example 1: marco sends 30 USD to webpack(USD collective, USD host). `hostCurrency` is the same as `currency`, `hostCurrencyFxRate` is 1.
        - example 2: marco sends 30 USD to weco(USD collective, EUR host). `hostCurrency`(EUR) is different than `currency`(USD), `hostCurrencyFxRate` will then convert the fees FROM **EUR** to **USD** to send to the ledger. 
     - We will be looking only for CREDIT transactions(DEBIT is just the same transaction but represented as the opposite, due to the double entry system) AND the fees are negatives, so we need to multiply by -1 to send values higher than zero. 
 - `LegacyCreditTransactionId` - current production `Transactions` of type `CREDIT` table id, this will be a temporary field to support the migration period keeping a state of the records that were already saved
 - `LegacyDebitTransactionId` - - current production `Transactions` of type `DEBIT` table id, this will be a temporary field to support the migration period keeping a state of the records that were already saved

### Cases that the migration is not working

1. PaymentMethodId is **NULL**
2. PaymentMethods table has service defined but does NOT have type defined (example: payment method has service **stripe** but its type is **NULL**(instead of for example **creditcard**))
3. FromCollectiveId is **NULL**(first case found in `LegacyCreditTransactionId` **100784**)
4. HostCollectiveId is **NULL** and/or hostCurrency is **NULL**(first case found `LegacyCreditTransactionId` **99531**)
5. WWcodeBerlin example: collective is EUR, host is USD, collective pays the fees but collective pays it in USD even though it's a host

#### 5th case: Collective is EUR, host is USD. Collective pays fees in USD even though it's not a USD Collective

- `WWCodeBerlin` is a **EUR** Collective AND its Host `Women Who Code 501c3` is a **USD** host.
- Backer `Pia` donates 10EUR to `WWCodeBerlin`. 
- the 10EUR are converted to **USD** because the Host of the collective is **USD**.
- the collective `WWCodeBerlin` pays all fees IN **USD** (platform fee 1USD, Payment processor fee 1USD AND Host fee 1USD)
- the collective keeps showing the money as **EUR** because that's its currency.

The current production Transaction table saves the fees in USD. That's not ideal for the Ledger because the `WWCodeBerlin` would have an EUR Wallet. so to make it work we are converting the fees saved in the current prod FROM USD to EUR using the fee `hostCurrencyFxRate` to get the fees in EUR. This may cause small differences due to the round when converting.


## Migration

Take a look on the [migration folder](https://github.com/opencollective/ledger/blob/master/docs/migration) to find more details about migration cases, queries and mapping.

- [Mapping](https://github.com/opencollective/ledger/blob/master/docs/migration/Mapping.md) explains how we map legacy/incoming transactions to the ledger format as well as how the creation of wallets, refunds and forex work.
- [Migration queries](https://github.com/opencollective/ledger/blob/master/docs/migration/migration_queries.md) - Useful queries when comparing data between the legacy and ledger transactions.
- [Migration non trivial cases](https://github.com/opencollective/ledger/blob/master/docs/migration/migration_non_trivial_cases.md) - Explanation on edge cases found out along the migration

## Useful queries

### Show all wallets from some Account

```sql
SELECT * FROM "Wallets" where "AccountId"='platform';
SELECT * FROM "Wallets" where "AccountId"='stripe';
SELECT * FROM "Wallets" where "AccountId"='18520';
```

### Show all transactions from some Account

```sql
SELECT * FROM "LedgerTransactions" where "FromAccountId"='18520' or "ToAccountId"='18520';
```

### Show all transactions from a wallet of a Account

```sql
SELECT * FROM "LedgerTransactions" l
LEFT JOIN "Wallets" fw on l."FromWalletId"=fw.id
LEFT JOIN "Wallets" tw on l."ToWalletId"=tw.id
where "FromAccountId"='18520' or "ToAccountId"='18520';
```

### Show the balance of a wallet

```sql
SELECT * FROM "Wallets" where "AccountId"='18520' limit 1; -- wallet id 17194
SELECT * FROM "PaymentMethods" where id=17674;
SELECT * FROM "LedgerTransactions" where "ToWalletId"=17194; -- all transactions
SELECT sum(amount) FROM "LedgerTransactions" where "ToWalletId"=17194; -- sum of amount(will NOT of forex transactions)
```

### Show all gift cards transactions given the Account/Collective who created those cards

In our example we'll use triplebyte:

```sql
-- 1) showing triplebyte gift cards AND its transactions transactions
SELECT * FROM "Collectives" WHERE slug='triplebyte'; -- triplebyte id 1863
-- 2) get all payment methods(gift cards) WHERE the source payment method id belong to triplebyte
SELECT * FROM "PaymentMethods" p
LEFT JOIN "PaymentMethods" sp ON p."SourcePaymentMethodId"=sp.id
WHERE  p."SourcePaymentMethodId" IS NOT NULL  AND sp."CollectiveId"=1863 ORDER BY  p.id desc; -- all gift cards FROM tripleByte
-- 3) selecting all wallets that used of one the virtual cards
SELECT * FROM "Wallets" WHERE "PaymentMethodId" IN 
	(SELECT p.id FROM "PaymentMethods" p
		LEFT JOIN "PaymentMethods" sp ON p."SourcePaymentMethodId"=sp.id
		WHERE  p."SourcePaymentMethodId" IS NOT NULL  AND sp."CollectiveId"=1863) ORDER BY  "PaymentMethodId"; -- all wallets FROM gift card generated by triplebyte

-- All transactions made by the wallets pointing to a virtualcard
SELECT * FROM "LedgerTransactions" WHERE 
"FromWalletId" IN 
	(SELECT id FROM "Wallets" WHERE "PaymentMethodId" IN 
		(SELECT p.id FROM "PaymentMethods" p
		 LEFT JOIN "PaymentMethods" sp ON p."SourcePaymentMethodId"=sp.id
		 WHERE p."SourcePaymentMethodId" IS NOT NULL  AND sp."CollectiveId"=1863
		)
	)
OR  
"ToWalletId" IN 
	(SELECT id FROM "Wallets" WHERE "PaymentMethodId" IN 
		(SELECT p.id FROM "PaymentMethods" p
		 LEFT JOIN "PaymentMethods" sp ON p."SourcePaymentMethodId"=sp.id
		 WHERE p."SourcePaymentMethodId" IS NOT NULL  AND sp."CollectiveId"=1863
		)
	)
ORDER BY  "createdAt" DESC;
```

## Benchmark

There is a simple bash script [benchmark.sh](scripts/benchmark.sh) that makes it easy to test the ledger service at scale.

This script will generate a png chart containg a chart of the number of requests/s.

### Requirements

- install [Apache bench](https://httpd.apache.org/docs/2.4/programs/ab.html)
    - on mac you can use brew: `$ brew install ab`
- install [gnuplot](http://www.gnuplot.info/)
    - on mac you can use brew: `$ brew install gnuplot`    

### Running

#### Concurrency:1, number of requests: 100

Using the GET transactions endpoint to get the last 20 transactions of the `AccountId 442`.

```
sh benchmark.sh -c1 -n100 http://localhost:3070/transactions?limit=20&offset=0&where=%7B%22ToAccountId%22%3A442%7D
```

#### Concurrency:10, number of requests: 1000

Using the GET transactions endpoint to get the last 20 transactions of the `AccountId 442`.

```
sh benchmark.sh -c10 -n1000 http://localhost:3070/transactions?limit=20&offset=0&where=%7B%22ToAccountId%22%3A442%7D
```
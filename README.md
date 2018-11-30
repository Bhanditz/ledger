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
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|
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
sh benchmark.sh -c1 -n100 http://127.0.0.1:3070/transactions?limit=20&offset=0&where=%7B%22ToAccountId%22%3A442%7D
```

#### Concurrency:10, number of requests: 1000

Using the GET transactions endpoint to get the last 20 transactions of the `AccountId 442`.

```
sh benchmark.sh -c10 -n1000 http://127.0.0.1:3070/transactions?limit=20&offset=0&where=%7B%22ToAccountId%22%3A442%7D
```
# Ledger

Core Ledger(Double-Entry System) Requirements and features.

## Usage

### Local

Make sure you have postgres installed and create the database `opencollective_ledger_dvl` . You will find all the details on how to install and create the necessary permissions on the [postgres doc](docs/postgres.md).
After having the database created, run :

- `npm install`
- `npm run db:migrate`
- `npm run dev` (to use nodemon) OR `npm run start`

#### Docker

// TO DO


## Tests

You'll need to have Postgres as well as the test db create with the name `opencollective_ledger_test`. You can use the npm script `npm run recreate-test-db`

- `npm install`
- `npm run migrate-test` OR `npm run recreate-test-db && NODE_ENV=test npm run test`

If you want to run just a specific test file, you can use this command:

- `npm run pretest && mocha --recursive --exit ./test/output/test/PATH_TO_YOUR_FILE_INSIDE_TEST FOLDER`
    - example: I want to test the file wallets.test.js with path test/wallets/wallets.test.js, so i'd run:
      - `npm run pretest && mocha --recursive --exit ./test/output/test/wallets/wallets.test.js`

## Documentation(REST)

We are using the library [apidoc](https://github.com/apidoc/apidoc) to generate this documentation. it generates a folder `api-docs` that has an `index.html` at its root which can be open to check the current endpoints.

- `npm run doc`


## Database models

### Accounts( "Old" Collectives)

`Entities` that are able to make transactions within the system

- `id`
- `slug` - unique string identifier of the account

### Providers

`Entities` That will identify the fees that can be applied to each Wallet

- `id`
- `name` - name of the provider
- `service` - As of today : [`OPENCOLLECTIVE`, `STRIPE`, `PAYPAL`]
- `type` - divisions of the services stated above
- `fixedFee` - a fixed fee in cents
- `percentFee` - a percentage
- `OwnerAccountId` - the owner Account of the provider(reference to `Accounts` table)

### Wallets

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `name` - name of the wallet
- `currency` - currency of the wallet, we may define all possible currencies. // To do: today this field is just a String, we need to define all possible types
- `OwnerAccountId` - The account that this wallet belongs to(reference to `Accounts` table)
- `ProviderId` - The provider that this wallet has (reference to `Providers` table)
- `temporary` - flag to identify if the Wallet is a "temporary" wallet(which means the wallet is supposed to always act as intermediary on forex transactions)


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
- `doubleEntryGroupId` - The UUID of the double entry pair transaction(for any CREDIT transaction there is a DEBIT transaction, and we can "find" all the pairs through this field)
- `transactionGroupId` - The UUID the transaction group -> When an account pays another account, there are several use cases and in all of them we will have more than one transaction at the very least. This field identify all transactions related to one "action of the system"
- `transactionGroupSequence` - The sequence of the transaction regarding its transaction group
- `transactionGroupTotalAmount` - The Gross Amount of the transaction regarding a whole transaction group. Example: account1 pays 30USD to account2 and this transaction has a 10% of platform Fee. The system will generate 4 transactions, 2 regarding the "normal" transaction(from account1 to account2) with the `amount` field having `27`USD(95% where in the DEBIT it will be `-27USD` and Credit `27USD`) and 2 regarding the fees with the `amount` field having `3`USD(5% where in the DEBIT it will be `-3USD` and Credit `3USD`). in All 4 transactions the field `transactionGroupTotalAmount` will be `30USD`.
- `transactionGroupTotalAmountInDestinationCurrency` - this field only applies for FOREX transactions: The Gross Amount in the "destination currency"(example: account1 sends 30EUR to account2 that has usd wallet, that will be converted to 45USD, and the value of `transactionGroupTotalAmountInDestinationCurrency` will be `45USD`) of the transaction regarding a whole transaction group


## API Endpoints

Run `npm run doc` to see most of the endpoint available and their requirements

### POST /transactions

#### Endpoint Payload

- `FromWalletId` - The Wallet Id of the account who's **sending** the money
- `ToWalletId` - The Wallet Id of the account who's **receiving** the money
- `amount` - The amount to be sent
- `currency` - The currency to be sent
- `destinationAmount` - *optional*(only for forex transactions): The amount in `destinationCurrency` which `receiver account` will get
- `destinationCurrency` - *optional*(only for forex transactions): Only for forex transactions: The currency which `receiver account` will get
- `walletProviderFee` - *optional* : the wallet provider fee to be charged
- `platformFee` - *optional* : the platform fee to be charged
- `paymentProviderFee` - *optional* : the payment provider fee to be charged
- `paymentProviderWalletId` - The Wallet Id of the Payment Provider
- `senderPayFees` - *optional* : flag indicating whether the sender will pay the fees(by default, the receiver pays the fees)

## Transactions Example

### Transaction with zero fees

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. No fees.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: webpack_USD, 
  amount: 3000, 
  currency: 'USD'
}
```    

And the ledger table would be:

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|-----------|------|--------|---------------|--------------|---------------------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD|3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |

### Transaction with Platform fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet.  Platform fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit and credit) and 2 more regarding the platform transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |    webpack   |  webpack_USD |   Xavier  |Xavier_USD  |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD | 3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |    Platform  | Platform_USD |   webpack |webpack_USD | -300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|  webpack_USD |  webpack_USD | Platform  |Platform_USD|  300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |

### Transaction with Payment Provider, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  paymentProviderFee: 300,
  paymentProviderWalletId: Stripe_Wallet,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|     Xavier   |  Xavier_USD  |  webpack  |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |     Stripe   | Stripe_WALLET|  webpack  |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|     webpack  |  webpack_USD |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |

### Transaction with Platform and Payment Provider fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. Platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWalletId: Stripe_Wallet,
}
```    

The total record generated on the ledger regarding this transaction will be 6 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |  webpack     |  webpack_USD | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|  Xavier      |  Xavier_USD  | webpack   |webpack_USD  |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |  Platform    | Platform_USD | webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|  webpack     |  webpack_USD | Platform  |Platform_USD |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|5 | DEBIT |  Stripe      | Stripe_WALLET| webpack   |webpack_USD  |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|6 | CREDIT|  webpack     |  webpack_USD |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |

### Transaction with Platform Fees,Payment Provider fees and Wallet Provider Fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. Platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: wwcode_USD, 
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWalletId: Stripe_Wallet,
}
```

The total record generated on the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit), 2 regarding the payment provider transaction(debit and credit) and 2 more regarding the wallet provider transaction(debit and credit) 

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |  Platform    | Platform_USD |  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|  wwcode      |  wwcode_USD  | Platform  |Platform_USD |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|5 | DEBIT |  Stripe      | Stripe_WALLET|  wwcode   |wwcode_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|6 | CREDIT|  wwcode      |  wwcode_USD  |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD |  wwcode   |wwcode_USD   |-300 |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |
|8 | CREDIT|  wwcode      |  wwcode_USD  | WWCodeInc |WWCodeInc_USD|300  |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |

### Transaction with Platform Fees,Payment Provider fees and Wallet Provider Fees, Sender Pays fees

Xavier(contributor) sends 30USD to wwcode's(Collective) USD Wallet. Platform fee of 3USD. Stripe(the Payment Provider) fee of 3USD. WWCodeInc(Wallet Provider) fee of 3USD. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: Xavier_USD, 
  ToWalletId: wwcode_USD, 
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWalletId: Stripe_Wallet,
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

The total record generated on the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit), 2 regarding the payment provider transaction(debit and credit) and 2 more regarding the wallet provider transaction(debit and credit) 

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |  wwcode      |  wwcode_USD  | Xavier    |Xavier_USD   |-2100 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|  Xavier      |  Xavier_USD  |  wwcode   |wwcode_USD   |2100  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |  Platform    | Platform_USD | Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|  Xavier      |  Xavier_USD  | Platform  |Platform_USD |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|5 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|6 | CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET|300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|7 | DEBIT |  WWCodeInc   |WWCodeInc_USD | Xavier    |Xavier_USD   |-300 |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |
|8 | CREDIT|  Xavier      |  Xavier_USD  | WWCodeInc |WWCodeInc_USD|300  |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |


### Forex Transaction

#### Xavier Contributes €30(through his EUR Wallet) to WWCode(USD Collective), Receiver Pay Fees(default behaviour)

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. Platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  FromWalletId: Xavier_EUR, 
  ToWalletId: wwcode_USD, 
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 100, 
  platformFee: 100, 
  paymentProviderFee: 100, 
  paymentProviderWalletId: Stripe_WALLET,
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId   |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|transactionGroupInDestinationCurrency|
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|---------------------------|-----------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |       3000                |       4500      |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |       3000                |       4500      |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000                |       4500      |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000                |       4500      |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4500|   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000                |       4500      |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000                |       4500      |
|7 | DEBIT |   Platform   | Platform_USD |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000                |       4500      |
|8 | CREDIT|   wwcode     | wwcode_USD   | Platform  |Platform_USD | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000                |       4500      |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |       3000                |       4500      |
|10| CREDIT|   wwcode     | wwcode_USD   |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |       3000                |       4500      |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   wwcode  | wwcode_USD  | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |       3000                |       4500      |
|12| CREDIT|   wwcode     | wwcode_USD   |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |       3000                |       4500      |

- rows #1 and #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 and #4 - **Stripe** sends 45USD(conversion from the 30EUR) to **Xavier**
- rows #5 and #6 - **Xavier** sends 45USD to **wwcode**
- rows #7 and #8 - **wwcode** pays 1USD of platform fee
- rows #9 and #10 - **wwcode** pays 1USD of payment provider fee 
- rows #11 and #12 - **wwcode** pays 1USD of wallet provider fee

#### Xavier Contributes €30(through his EUR Wallet) to WWCodeAtlanta(who's a USD Collective), Sender Pay Fees

Xavier(contributor) sends 30EUR(that'll be converted to 45USD) to wwcode's(Collective) USD Wallet. Platform fee of 1USD. Stripe(the Payment Provider) fee of 1USD. WWCodeInc(Wallet Provider) fee of 1USD. 

Payload:

```javascript
{
  FromWalletId: Xavier_EUR, 
  ToWalletId: wwcode_USD, 
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 100, 
  platformFee: 100, 
  paymentProviderFee: 100, 
  paymentProviderWalletId: Stripe_WALLET,
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId   |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|transactionGroupInDestinationCurrency|
|--|-------|--------------|--------------|-----------|-------------|------|--------|---------------|--------------|---------------------------|-----------------|
|1 | DEBIT |  Stripe      | Stripe_WALLET| Xavier    |Xavier_EUR   | -3000|   EUR  | TG_GROUP_1    |DoubleEntry_1 |       3000                |       4500      |
|2 | CREDIT|  Xavier      |  Xavier_EUR  |  Stripe   |Stripe_WALLET| 3000 |   EUR  | TG_GROUP_1    |DoubleEntry_1 |       3000                |       4500      |
|3 | DEBIT |  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| -4500|   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000                |       4500      |
|4 | CREDIT|  Stripe      | Stripe_WALLET| Xavier    |Xavier_USD   | 4500 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000                |       4500      |
|5 | DEBIT |   wwcode     | wwcode_USD   |   User1   |User1_USD    | -4200|   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000                |       4500      |
|6 | CREDIT|  Xavier      |  Xavier_USD  |   wwcode  | wwcode_USD  | 4200 |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000                |       4500      |
|7 | DEBIT |   Platform   | Platform_USD |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000                |       4500      |
|8 | CREDIT|  Xavier      |  Xavier_USD  | Platform  |Platform_USD | 100  |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000                |       4500      |
|9 | DEBIT |  Stripe      | Stripe_WALLET|   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_5 |       3000                |       4500      |
|10| CREDIT|  Xavier      |  Xavier_USD  |  Stripe   |Stripe_WALLET| 100  |   USD  | TG_GROUP_1    |DoubleEntry_5 |       3000                |       4500      |
|11| DEBIT |  WWCodeInc   |WWCodeInc_USD |   User1   |User1_USD    | -100 |   USD  | TG_GROUP_1    |DoubleEntry_6 |       3000                |       4500      |
|12| CREDIT|  Xavier      |  Xavier_USD  |WWCodeInc  |WWCodeInc_USD| 100  |   USD  | TG_GROUP_1    |DoubleEntry_6 |       3000                |       4500      |

- rows #1 and #2 - **Xavier** sends 30EUR to Stripe.
- rows #3 and #4 - **Stripe** sends 45USD(conversion from the 30EUR) to **Xavier**
- rows #5 and #6 - **Xavier** sends 42USD to **wwcode**
- rows #7 and #8 - **Xavier** pays 1USD of platform fee
- rows #9 and #10 - **Xavier** pays 1USD of payment provider fee 
- rows #11 and #12 - **Xavier** pays 1USD of wallet provider fee

#### Xavier Contributes €30(through his EUR Wallet) to WWCodeBerlin(who's a EUR Collective) to its "WWCode 501c3" USD Wallet
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
- `FromWalletName`- The Wallet of the Account responsible for sending the money in the transaction
- `ToWalletName`- The Wallet of the Account responsible for Receiving the money in the transaction
- `amount`- The NET amount of the transaction
- `currency` - The currency of the transaction
- `doubleEntryGroupId` - The UUID of the double entry pair transaction(for any CREDIT transaction there is a DEBIT transaction, and we can "find" all the pairs through this field)
- `transactionGroupId` - The UUID the transaction group -> When an account pays another account, there are several use cases and in all of them we will have more than one transaction at the very least. This field identify all transactions related to one "action of the system"
- `transactionGroupSequence` - The sequence of the transaction regarding its transaction group
- `transactionGroupTotalAmount` - The Gross Amount of the transaction regarding a whole transaction group. Example: account1 pays 30USD to account2 and this transaction has a 10% of platform Fee. The system will generate 4 transactions, 2 regarding the "normal" transaction(from account1 to account2) with the `amount` field having `27`USD(95% where in the DEBIT it will be `-27USD` and Credit `27USD`) and 2 regarding the fees with the `amount` field having `3`USD(5% where in the DEBIT it will be `-3USD` and Credit `3USD`). in All 4 transactions the field `transactionGroupTotalAmount` will be `30USD`.


## API Endpoints

Run `npm run doc` to see most of the endpoint available and their requirements

### POST /transactions

#### Endpoint Payload

- `FromAccountId` - The identification of the Account that's sending money, *String*
- `ToAccountId` - The identification of the Account that's receiving money, *String*
- `FromWalletName` - Wallet of the FromAccount, *String*
- `ToWalletName` - Wallet of the ToAccount, *String*
- `amount` - Amount that's going to be taken from the FromWallet, *Number*
- `currency` - currency of the amount field, *String*
- `destinationAmount` - amount used in forex transactions, *Number*, *optional*
- `destinationCurrency` - currency of the destinationAmount field, used in forex transactions, *String*, *optional*
- `platformFee` - the platform fee in cents(if forex transaction, in destinationCurrency), *Number*, *optional*
- `paymentProviderFee` - the payment provider fee in cents(if forex transaction, *Number*, *optional*
- `PaymentProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `PaymentProviderWalletName` - Wallet of the payment provider, *String*, *optional*
- `walletProviderFee` - the wallet provider fee in cents(if forex transaction), *Number*, *optional*
- `WalletProviderAccountId` - Account id of the payment provider, *String*, *optional*
- `WalletProviderWalletName` - Wallet of the payment provider, *String*, *optional*
- `senderPayFees` - flag indicating whether the sender will pay fees, *Boolean*, *optional*

## Transactions Example

### Transaction with zero fees

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet. No fees.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletName: Xavier_USD, 
  ToWalletName: webpack_USD, 
  amount: 3000, 
  currency: 'USD'
}
```    

And the ledger table would be:

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|-----------|------|--------|---------------|--------------|---------------------------|
|1 | DEBIT |     webpack  |  webpack_USD |   Xavier  |Xavier_USD |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |
|2 | CREDIT|    Xavier    |  Xavier_USD  |   webpack |webpack_USD|3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |

### Transaction with Platform fees, Receiver Pays fees(default behaviour)

Xavier(contributor) sends 30USD to webpack's(Collective) USD Wallet.  Platform fee of 3USD.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletName: Xavier_USD, 
  ToWalletName: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit and credit) and 2 more regarding the platform transaction(debit and credit)

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
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
  FromWalletName: Xavier_USD, 
  ToWalletName: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  paymentProviderFee: 300,
  PaymentProviderWalletName: Stripe_Wallet,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "account to account" transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
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
  FromWalletName: Xavier_USD, 
  ToWalletName: webpack_USD, 
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
  paymentProviderFee: 300,
  PaymentProviderWalletName: Stripe_Wallet,
}
```    

The total record generated on the ledger regarding this transaction will be 6 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
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
  FromWalletName: Xavier_USD, 
  ToWalletName: wwcode_USD, 
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  platformFee: 300,
  paymentProviderFee: 300,
  PaymentProviderWalletName: Stripe_Wallet,
}
```

The total record generated on the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit), 2 regarding the payment provider transaction(debit and credit) and 2 more regarding the wallet provider transaction(debit and credit) 

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
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
  FromWalletName: Xavier_USD, 
  ToWalletName: wwcode_USD, 
  amount: 3000, 
  currency: 'USD',
  walletProviderFee: 300, // if this field is not provided the wallet provider fee will for its default fees stored in the database
  platformFee: 300,
  paymentProviderFee: 300,
  PaymentProviderWalletName: Stripe_Wallet,
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

The total record generated on the ledger regarding this transaction will be 8 as we would have 2 regarding the "account to account" transaction(debit and credit), 2 regarding the platform transaction(debit and credit), 2 regarding the payment provider transaction(debit and credit) and 2 more regarding the wallet provider transaction(debit and credit) 

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
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
  FromWalletName: Xavier_EUR, 
  ToWalletName: wwcode_USD, 
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 100, 
  platformFee: 100, 
  paymentProviderFee: 100, 
  PaymentProviderWalletName: Stripe_WALLET,
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName   |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|transactionGroupInDestinationCurrency|
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
  FromWalletName: Xavier_EUR, 
  ToWalletName: wwcode_USD, 
  amount: 3000, 
  currency: 'EUR', 
  destinationAmount: 4500, // The amount to be received(same currency as defined in the "destinationCurrency" field)
  destinationCurrency: 'USD', // The currency to be received
  walletProviderFee: 100, 
  platformFee: 100, 
  paymentProviderFee: 100, 
  PaymentProviderWalletName: Stripe_WALLET,
  senderPayFees: true // flag to indicate the sender will be paying the fees
}
```

This would generate a total of 12 transactions in the ledger table:

|# | type  | FromAccountId| FromWalletName |ToAccountId|ToWalletName   |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|transactionGroupInDestinationCurrency|
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

### 2018-10-19 simple Case Demo

The focus of this demo is to have the Ledger working with a simple case:

1. Choose a host: Open Source Collective 501c6 (Collective id 11004)
2. Choose 2 collectives: Marco Barcellos(Collective id 18520) and MochaJS (Collective id 58)
3. Migrate and Insert new data regarding them:
  - Migrate transactions regarding only the host and the 2 collectives, and transactions of same currency) 
   coming into the current api, after saving it also store on the ledger
  - For every new transaction(regarding only the host and the 2 collectives, and transactions of same currency) 
   coming into the current api, after saving it also store on the ledger.   

```sql
select * from "Collectives" where id in( 18520, 11004, 58); -- respectively marco(BACKER), Open Source Collective 501c6 (HOST) and MochaJS(Collective)
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE t."CollectiveId"=58 and t."FromCollectiveId"=18520 and t.type='CREDIT'; -- Marco sending money to MochaJs
```

### Mapping query


L
```sql
-- finding forex tx
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE amount != "amountInHostCurrency" and "HostCollectiveId" is not null order by t.id DESC;

-- choosing one of them through TransactionGroup Field
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' and t.type='CREDIT' and t."deletedAt" is null;

-- Mapping
 select t."FromCollectiveId" as "FromAccountId", t."FromCollectiveId" || '_' || t."PaymentMethodId" as "FromWalletName", t."CollectiveId" as "ToAccountId", t."CollectiveId" || '_Wallet' as "ToWalletName", t.amount, t.currency, t."amountInHostCurrency" as "destinationAmount", t."hostCurrency" as "destinationCurrency", t."hostFeeInHostCurrency" as "walletProviderFee", t."HostCollectiveId" as "WalletProviderAccountId", t."HostCollectiveId" || '_' || t."PaymentMethodId" as "WalletProviderWalletName", t."platformFeeInHostCurrency" as "platformFee", t."paymentProcessorFeeInHostCurrency" as "paymentProviderFee", p.service as "PaymentProviderAccountId", p.service as "PaymentProviderWalletName", t.id as "LegacyTransactionId" from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='4495b880-1d9c-4e16-8980-e1280ccb3139' and t.type='CREDIT';

```

## Current Production Migration cases

This is going to be a list of problems, approaches and **real** use cases found along the migration.

### Mapping

If we Consider a simple query(that filters only CREDIT transactions) from the current production database:
```sql
select t.*, p.service as "pmService", p.type as "pmType" from "Transactions" t 
left join "PaymentMethods" p on t."PaymentMethodId"=p.id
WHERE t.type='CREDIT';
```

We can map this query to the following ledger transaction endpoint payload:

```js
{
  FromAccountId: transaction.FromCollectiveId,
  FromWalletName: transaction.PaymentMethodId,
  ToAccountId: transaction.CollectiveId,
  ToWalletName: `${transaction.CollectiveId}_${transaction.HostCollectiveId}`, // We are going to create a pair (CollectiveId, HostCollectiveId)
  amount: transaction.amountInHostCurrency,
  currency: transaction.hostCurrency,
  destinationAmount: transaction.amount, // ONLY for FOREX transactions(currency != hostCurrency)
  destinationCurrency: transaction.currency, // ONLY for FOREX transactions(currency != hostCurrency)
  walletProviderFee: Math.round(-1 * transaction.hostFeeInHostCurrency/transaction.hostCurrencyFxRate), // CREDIT txs have negative fees
  WalletProviderAccountId: transaction.HostCollectiveId,
  WalletProviderWalletName: `${transaction.HostCollectiveId}`,
  platformFee: Math.round(-1 * transaction.platformFeeInHostCurrency/transaction.hostCurrencyFxRate), // CREDIT txs have negative fees
  paymentProviderFee: Math.round(-1 * transaction.paymentProcessorFeeInHostCurrency/transaction.hostCurrencyFxRate), // CREDIT txs have negative fees
  PaymentProviderAccountId: transaction.pmService, // PaymentMethod.service
  PaymentProviderWalletName: transaction.pmType, // PaymentMethod.type
  LegacyTransactionId: transaction.id,
}
```

Fields that deserve more attention:

- `FromWalletName` - This will be set to the `PaymentMethodId` of the transaction
- `ToWalletName` - All Collectives will have a Wallet that will have the id as the combination of the `CollectiveId` with the `HostCollectiveId` fields
- `WalletProviderAccountId` - This will be set to the `HostCollectiveId` of the transaction
- `WalletProviderWalletName` - This will be set with the same of the account of the wallet provider: `HostCollectiveId` of the transaction
- `PaymentProviderAccountId` - this will be set as the service of the payment method `service` field(stripe, paypal, opencollective, etc...)
- `PaymentProviderWalletName` - this will be set as the service of the payment method `type` field(creditcard, adaptive, collective, etc...)
- `walletProviderFee`, `platformFee` and `paymentProviderFee`
     - The fees are always paid according to the `hostCurrency` field, but the **collective**(from the `CollectiveId` field) will be responsible to pay those fees, so we will be sending the fees(in `hostCurrency`) divided by the `hostCurrencyFxRate` to then obtain the fees in the `currency` field to send to the ledger. 
        - example 1: marco sends 30 USD to webpack(USD collective, USD host). `hostCurrency` is the same as `currency`, `hostCurrencyFxRate` is 1.
        - example 2: marco sends 30 USD to weco(USD collective, EUR host). `hostCurrency`(EUR) is different than `currency`(USD), `hostCurrencyFxRate` will then convert the fees from **EUR** to **USD** to send to the ledger. 
     - We will be looking only for CREDIT transactions(DEBIT is just the same transaction but represented as the opposite, due to the double entry system) and the fees are negatives, so we need to multiply by -1 to send values higher than zero. 
 - `LegacyTransactionId` - current production `Transactions` table id, this will be a temporary field to support the migration period keeping a state of the records that were already saved

### Use Case 1: Backer, Collective and Host are USD, but transaction hostCurrency is GBP

The backer uses Payment method(id 8960) that has a currency as USD, the host of the collective is also USD. but in the following transaction it says the the hostCurrency is GBP, even with none of the entities(collectives and payment method) being in GBP. What I figured out is that the card that's stored on the User Stripe account is a GBP credit and then the transaction fees are paid in GBP.

```sql
	select * from "Collectives" where id in( 8974, 10506, 8975); -- respectively the backer, the collective and the host
select * from "Transactions" t left join "PaymentMethods" p on t."PaymentMethodId"=p.id WHERE "TransactionGroup"='9d7ad496-55c3-4934-8472-780c152ade88' and t.type='CREDIT';
```

The problem regarding the migration to the ledger in this case is that the fees are paid in GBP even with the Collective being USD and converting this money. Let's make an example:

- The backer(collective id 8974) is James. The collective(collective id 10506) is weco. The host is finance(collective id 8975).
- The action: James sends 10USD to Weco.

we then have the following actions:

- James try to send 10USD to weco through Stripe, but its card is GBP card so Stripe converts it to GBP at a rate of 0.751 so james actually sends 7.51GBP to weco. 
- weco pays fees in GBP(platform fee 0.38GBP, host fee 0.38GBP, payment processor fee 0.31GBP). 
- weco then has the netAmount 6.44GBP. 
- But as weco is a USD collective, it will actually "see" as 6.44GBP divided by the fx Rate(0.751) to a total of 8.58USD.

Approaching this situation on the ledger
-

the ledger is flexible enough to make either the sender or the receiver pay the fees, but the fees need to be in the "destinationCurrency"(in this case, USD).

- James sends 7.51GBP to STRIPE.
- Stripe sends 10USD to James.
- James pays 10USD to weco.
- weco pays 0.51USD( estimated conversion of 0.38GBP/0.751) to the platform
- weco pays 0.51USD( estimated conversion of 0.38GBP/0.751) to the host
- weco pays 0.41USD( estimated conversion of 0.38GBP/0.751) to stripe
- weco has a net amount of 8.57USD(10-0.51-0.51-0.41)

{"last4":"5233","fullName":"MR JH WEIR","expMonth":3,"expYear":2020,"brand":"Visa","country":"GB","funding":"debit","customerIdForHost":{"acct_1BQyUVIgk6cKOkUW":"cus_Bwxrcp4scdGXTp"}}
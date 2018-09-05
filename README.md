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


## API Endpoints

Run `npm run doc` to see most of the endpoint available and their requirements

### POST /transactions


## Transactions Example

### Transaction with zero fees(Wallet Provider has No Fee)

In Some cases, the system will no charge fees to transactions under certain conditions(for example, the accounts have already cashed in money to their wallets before thus already paid fees). Example: Account1(called User1) pays 30USD to Account2(called User2) without fees.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: User1_USD, // We don't need to set the FromAccountId on the endpoint as we can get the account from the field `OwnerAccountId` present on the Wallet Model
  ToWalletId: User2_USD, // We don't need to set the ToAccountId as well for the same reason stated above
  amount: 3000, 
  currency: 'USD'
}
```    

And the ledger table would be:

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId|amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|----------|------|--------|---------------|--------------|---------------------------|
|1 | DEBIT |     User2    |  User2_USD   |   User1   |User1_USD |-3000 |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |
|2 | CREDIT|     User1    |  User1_USD   |   User2   |User2_USD |3000  |   USD  | TG_GROUP_1    |DoubleEntry_1 |         3000              |

PS.: We are supposing the FromWallet Provider has No Fee(For each Wallet there is a Provider that may have fees that apply)

### Transaction with Platform fees(Wallet Provider has No Fee)

Example: Account1(called User1) pays 30USD to Account2(called User2) when there is a 10% Platform fee. In this case we need to input the platformFee(the platform information like its account and wallets are already set and can be found by system)

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: User1_USD, // We don't need to set the FromAccountId on the endpoint as we can get the account from the field `OwnerAccountId` present on the Wallet Model
  ToWalletId: User2_USD, // We don't need to set the ToAccountId as well for the same reason stated above
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "normal" transaction(debit and credit) and 2 more regarding the platform transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |     User2    |  User2_USD   |   User1   |User1_USD   |-2700 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|     User1    |  User1_USD   |   User2   |User2_USD   | 2700 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |   Platform   | Platform_USD |   User1   |User1_USD   | -300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|     User1    |  User1_USD   | Platform  |Platform_USD|  300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |

PS.: We are supposing the FromWallet Provider has No Fee(For each Wallet there is a Provider that may have fees that apply)

### Transaction with Payment Provider fees(Wallet Provider has No Fee)

Example: Account1(called User1) pays 30USD to Account2(called User2) when there is a 10% Payment Provider fee. In this case we need to input the Payment provider Fee(field `paymentProviderFee`) and the Payment provider wallet id( as the payment provider should have more than wallet this field is necessary so the system knows for sure it's depositing money on the right wallet). 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: User1_USD, // We don't need to set the FromAccountId on the endpoint as we can get the account from the field `OwnerAccountId` present on the Wallet Model
  ToWalletId: User2_USD, // We don't need to set the ToAccountId as well for the same reason stated above
  amount: 3000, 
  currency: 'USD',
  paymentProviderFee: 300,
  paymentProviderWalletId: PP_WALLET,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "normal" transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |     User2    |  User2_USD   |   User1   |User1_USD   |-2700 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|     User1    |  User1_USD   |   User2   |User2_USD   |2700  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |      PP      |  PP_WALLET   |   User1   |User1_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|     User1    |  User1_USD   |   PP      |PP_WALLET   |300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |

PS.: We are supposing the FromWallet Provider has No Fee(For each Wallet there is a Provider that may have fees that apply)

### Transaction with Platform and Payment Provider fees(Wallet Provider has No Fee)

Example: Account1(called User1) pays 30USD to Account2(called User2) when there is a 10% Platform fee and a 10% Payment Provider fee. In this case we need to input the Platform Fee(field `platformFee`), the Payment provider Fee(field `paymentProviderFee`) and the Payment provider wallet id. 

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: User1_USD, // We don't need to set the FromAccountId on the endpoint as we can get the account from the field `OwnerAccountId` present on the Wallet Model
  ToWalletId: User2_USD, // We don't need to set the ToAccountId as well for the same reason stated above
  amount: 3000, 
  currency: 'USD',
  platformFee: 300,
  paymentProviderFee: 300,
  paymentProviderWalletId: PP_WALLET,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "normal" transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |     User2    |  User2_USD   |   User1   |User1_USD   |-2400 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|     User1    |  User1_USD   |   User2   |User2_USD   |2400  |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |   Platform   | Platform_USD |   User1   |User1_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|     User1    |  User1_USD   | Platform  |Platform_USD|300   |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|5 | DEBIT |      PP      |  PP_WALLET   |   User1   |User1_USD   |-300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|6 | CREDIT|     User1    |  User1_USD   |   PP      |PP_WALLET   |300   |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |

PS.: We are supposing the FromWallet Provider has No Fee(For each Wallet there is a Provider that may have fees that apply)

### Transaction with Platform Fees,Payment Provider fees and Wallet Provider Fees

Example: Account1(called User1) pays 30USD to Account2(called User2) when there is a 10% Platform fee and a 10% Payment Provider fee. In this case we need to input the Platform Fee(field `platformFee`), the Payment provider Fee(field `paymentProviderFee`) and the Payment provider wallet id. 
The Wallet Provider can be found through the field `ProviderId` under the model `Wallet` which point ot the `Provider` model that contains its fees(`fixedFee` and `percentFee`).In this example we are supposing a `10%` Wallet Provider Fee(we will consider the Provider Account called `WP` and the Wallet Called `WP_WALLET`.

We would have the `POST /transactions` endpoint with the following payload:

```javascript
{
  FromWalletId: User1_USD, // We don't need to set the FromAccountId on the endpoint as we can get the account from the field `OwnerAccountId` present on the Wallet Model
  ToWalletId: User2_USD, // We don't need to set the ToAccountId as well for the same reason stated above
  amount: 30, 
  currency: 'USD',
  platformFee: 0.1,
  paymentProviderFee: 0.1,
  paymentProviderWalletId: PP_WALLET,
}
```    

The total record generated on the ledger regarding this transaction will be 4 as we would have 2 regarding the "normal" transaction(debit and credit) and 2 more regarding the payment provider transaction(debit and credit)

|# | type  | FromAccountId| FromWalletId |ToAccountId|ToWalletId  |amount|currency|TransactioGroup|DoubleEntryId |transactionGroupTotalAmount|
|--|-------|--------------|--------------|-----------|------------|------|--------|---------------|--------------|-----------------|
|1 | DEBIT |     User2    |  User2_USD   |   User1   |User1_USD   | -2100|   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|2 | CREDIT|     User1    |  User1_USD   |   User2   |User2_USD   | 2100 |   USD  | TG_GROUP_1    |DoubleEntry_1 |       3000      |
|3 | DEBIT |   Platform   | Platform_USD |   User1   |User1_USD   | -300 |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|4 | CREDIT|     User1    |  User1_USD   | Platform  |Platform_USD| 300  |   USD  | TG_GROUP_1    |DoubleEntry_2 |       3000      |
|5 | DEBIT |      PP      |  PP_WALLET   |   User1   |User1_USD   | -300 |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|6 | CREDIT|     User1    |  User1_USD   |   PP      |PP_WALLET   | 300  |   USD  | TG_GROUP_1    |DoubleEntry_3 |       3000      |
|7 | DEBIT |      WP      |  WP_WALLET   |   User1   |User1_USD   | -300 |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |
|8 | CREDIT|     User1    |  User1_USD   |   WP      |WP_WALLET   | 300  |   USD  | TG_GROUP_1    |DoubleEntry_4 |       3000      |


## Multi-currency not implemented yet

This needs to be discussed a little bit more but for now we'll keep the example below that was first discussed(We are ignoring the Fees transaction for simplicity's sake):

### MultiCurrency - Account 1 sends 30EUR to Account 2 Which wallet is an USD wallet

We are considering the Account 1 does not have 30EUR in his wallet so it will need to Cash in the 30EUR from his Default Cashin Wallet as well.

POST /transactions 
  -  `{"FromAccountId":"User1", "ToAccountId":"User2", "FromWalletId":"User1_EUR", "ToWalletId":"User2_USD", "amount": 30, "currency": "EUR"}`

|# | type   | AccountId  | FromAccountId | amount |currency |WalletId  |FromWalletId  |TransactioGroup| DoubleEntryId       |
|--|--------|------------|--------------|--------|---------|-----------|--------------|---------------| --------------|
|1 | debit  |   User1    |     User1    |  -30   |   EUR   | User1_EUR |  User1_CC    | UUID_GROUP_1  | DoubleEntry_1 |
|2 | credit |   User1    |     User1    |  30    |   EUR   | User1_CC  |  User1_EUR   | UUID_GROUP_1  | DoubleEntry_1 |
|3 | debit  |   User1    |     User1    |  -30   |   EUR   | User1_CC  |  User1_EUR   | UUID_GROUP_1  | DoubleEntry_2 |
|4 | credit |   User1    |     User1    |  30    |   EUR   | User1_EUR |  User1_CC    | UUID_GROUP_1  | DoubleEntry_2 |
|5 | debit |    User1    |     User1    |  -45   |   USD   | User1_USD |  User1_CC    | UUID_GROUP_1  | DoubleEntry_3 |
|6 | credit |   User1    |     User1    |  45    |   USD   | User1_CC  |  User1_USD   | UUID_GROUP_1  | DoubleEntry_3 |
|7 | debit  |   User1    |     User2    | -45    |   USD   | User2_USD |  User1_USD   | UUID_GROUP_1  | DoubleEntry_4 |
|8 | credit |   User2    |     User1    |  45    |   USD   | User2_USD |  User1_USD   | UUID_GROUP_1  | DoubleEntry_4 |

- rows number 1 and 2 : User1 cashes in from His Default Credit card Wallet **User1_CC** to his EUR Wallet **User1_EUR**
- from the row 3  to 6  : User1 exchanges 30EUR for 45USD: His  **User1_EUR** Send its 30EUR to his **User1_CC** Which then exchanges it(outside the system) and finally sends the converted 45USD to the User **User1_USD**
- rows number 7 and 8 : **User1** sends 45USD from his **User1_USD** Wallet to the **User2** **User2_USD** Wallet

## Fees(Platform, Payment providers and wallets)

The platform and payment providers fees will be present in the `POST /transactions` input. The Wallets fee(old `Host` fees) will be found through the `Wallet Provider` defined in the `Wallet` model(field `ProviderId` that points to the `Providers` model). 

## TO Do
- Multi Currency Transactions
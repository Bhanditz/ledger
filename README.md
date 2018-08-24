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

### Wallets

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `name` - name of the wallet
- `currency` - currency of the wallet, we may define all possible currencies and also a "special" type `multi-currency`(A credit card wallet may be multi-currency). // To do: today this field is just a String, we need to define all possible types
- `OwnerAccountId` - The account that this wallet belongs to

### Transactions

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- `id`
- `type` - **Credit** or **Debit**
- `FromAccountId`- The Account responsible for sending the money in the transaction
- `ToAccountId`- The Account responsible for receiving the money in the transaction
- `FromWalletId`- The Wallet of the Account responsible for sending the money in the transaction
- `ToWalletId`- The Wallet of the Account responsible for Receiving the money in the transaction
- `amount`- The amount of the transaction
- `currency` - The currency of the transaction
- `doubleEntryGroupId` - The UUID of the double entry pair transaction(for any CREDIT transaction there is a DEBIT transaction, and we can "find" all the pairs through this field)
- `transactionGroupId` - The UUID the transaction group -> When an account pays another account, there are several use cases and in all of them we will have more than one transaction at the very least. This field identify all transactions related to one "action of the system"


## API Endpoints

Run `npm run doc` to see most of the endpoint available and their requirements

### POST /transactions


## Transactions Example

### Basic "Cashin" Transaction - Account 1 cashes in 30USD

Account 1(called User1) has 2 wallets, its Credit Card Wallet(User1_CC) and its USD Wallet(User1_USD). The Credit card wallet is set as "default cash in"  by the account 1. When the user asks the system(through the website, graphql, rest api, etc) to create a "cashin":

1. He will define the `FromAccountId` and `ToAccountId` as his account(in the end he's sending money to himself through different wallets), 
2. he will define the `ToWalletId` as the Wallet he wants to receive the money(in the example case `User1_USD`).
3. If he has a `DefaultCashinWalletId` defined, he could but doesn't need to declare the `FromWalletId` then the system will look for his Default Wallet.
4. Declare the amount and currency
5. POST /transactions 
    -  `{"FromAccountId":"User1", "ToAccountId":"User1", "ToWalletId":"User1_USD", "amount": 30, "currency": "USD"}`

|# | type   |ToAccountId | FromAccountId | amount |currency |FromWalletId|  ToWalletId   |TransactioGroup| DoubleEntryId |
|--|--------|------------|--------------|--------|----------|-------------|--------------|---------------| --------------|
|1 | DEBIT  |   User1    |     User1    |  -30   |   USD    | User1_USD   |  User1_CC    | TG_GROUP_1    | DoubleEntry_1 |
|2 | CREDIT |   User1    |     User1    |  30    |   USD    | User1_CC    |  User1_USD   | TG_GROUP_1    | DoubleEntry_1 |

### Account 1 sends 30USD to Account 2 

Account 1(called User1) has 2 wallets, its Credit Card Wallet(User1_CC) and its USD Wallet(User1_USD). The Credit card wallet is set as "default cash in"  by the account 1. 
Account 2 has 1 wallet(Not a Default) : User2_USD

As the Account 1 Wallet will have no 30USD in its balance, it will need to Cash in prior to send the value to the Account 2 which is goin to generate a total of 4 transactions

When the user asks the system(through the website, graphql, rest api, etc) to create a "cashin":

1. He will define the `FromAccountId:User1` and `ToAccountId:User2` as his account(in the end he's sending money to himself through different wallets), 
2. he will define one of his wallets to send the money: `FromWalletId:User1_USD`. AS this wallet won't have money, it will need to cash in(looking for his "Default Cashin Wallet").
3. he will define the `ToWalletId:User2_USD`.
4. Declare the amount and currency.
5. POST /transactions 
    -  `{"FromAccountId":"User1", "ToAccountId":"User2", "FromWalletId":"User1_USD", "ToWalletId":"User2_USD", "amount": 30, "currency": "USD"}`

|# | type   |ToAccountId | FromAccountId | amount |currency |FromWalletId|  ToWalletId   |TransactioGroup| DoubleEntryId |
|--|--------|------------|--------------|--------|----------|-------------|--------------|---------------| --------------|
|1 | DEBIT  |   User1    |     User1    |  -30   |   USD    | User1_USD   |  User1_CC    | TG_GROUP_1    | DoubleEntry_1 |
|2 | CREDIT |   User1    |     User1    |  30    |   USD    | User1_CC    |  User1_USD   | TG_GROUP_1    | DoubleEntry_1 |
|3 | DEBIT  |   User1    |     User2    |  -30   |   USD    | User2_USD   |  User1_USD   | TG_GROUP_1    | DoubleEntry_2 |
|4 | CREDIT |   User2    |     User1    |  30    |   USD    | User1_CC    |  User2_USD   | TG_GROUP_1    | DoubleEntry_2 |

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

PS: TO DO in the code today...

## TO Do

- Hosts, Platform and Payment processors fees(50%)
- Multi Currency Transaction(50%)
- Add Host to database?
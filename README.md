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

- `npm install`
- `npm run test`

## Documentation(REST)

We are using the library [apidoc](https://github.com/apidoc/apidoc) to generate this documentation. it generates a folder `api-docs` that has an `index.html` at its root which can be open to check the current endpoints.

- `npm run doc`


## Database models

### Payment Provider

Once a payment has been made, the transaction will be associated with one or more payment providers(Stripe, Paypal, btc address, etc...)

- id
- name
- type

### Collectives (Account?)

`Entities` that are able to make transactions within the system

- id
- currency
- slug

### Wallets

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- id
- currency
- OwnerCollectiveId
- PaymentProviderId

### Transactions

A Wallet will belong to a Collective(Account?) which a Collective may(and likely will) have more than one wallet.

- id
- WalletId
- CollectiveId
- FromCollectiveId
- amount
- currency
- type

## Transactions Example

An Example of a FX Transaction: Xavier pays 100 EUR to Marco(USD(host?) Account) that will have 3 fees: The Host fee(10%), the OpenCollective fee(5%) and the Stripe fee(5%)

| type   | collective | fromCollective | amount | currency | wallet|
|--------|------------|----------------|--------|----------|-------|
| debit  |   xavier   |     marco      |  -100  |   EUR    |       |
| credit |   marco    |     xavier     |  100   |   EUR    |       |
| debit  |   marco    |     stripe     |  -100  |   EUR    |       |
| credit |   stripe   |     marco      |  120   |   USD    |       |
| debit  |   stripe   |     marco      |  -120  |   USD    |       |
| credit |   marco    |     stripe     |  100   |   EUR    |       |
| debit  |   marco    |     stripe     |  -6    |   USD    |       |
| credit |   stripe   |     marco      |  6     |   USD    |       |
| debit  |   marco    |     OC         |  -6    |   USD    |       |
| credit |   OC       |     marco      |  6     |   USD    |       |
| debit  |   marco    |     host       |  -12   |   USD    |       |
| credit |   host     |     marco      |  12    |   USD    |       |


## API Endpoints

### POST /transactions

Parameters:

- fromCollectiveId
- fromWalletId
- toCollectiveId
- toWalletId
- amount
- currency
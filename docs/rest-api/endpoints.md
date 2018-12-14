## API Endpoints

### GET /ping

Healthcheck endpoint

### POST /transactions

#### Current Parameters:

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

### GET /transactions

#### Query Parameters:

- `FromAccountId` - Sender Account(legacy Collective)
- `ToAccountId` - Sender Account(legacy Collective)
- `FromWalletId`	- Wallet id of the Account stated FromAccountId
- `ToWalletId` - Wallet id of the Account stated ToAccountId
- `amount` - Amount of the transaction
- `currency` - currency of the amount field
- `TransactionGroup` - Group UUID of a transaction
- `createdAt` - Date the transaction was created
- `updatedAt` - Date the transaction was updated


### POST /wallet

endpoint temporarily disable for security purposes(we do not want to create wallets through this endpoint at the moment).

#### Parameters:


- `AccountId` - The account that the wallet belongs to
- `OwnerAccountId` - The Owner Account of the wallet
- `name` - name of the wallet
- `currency` - currency of the amount field
- `PaymentMethodId` - The legacy Payment method Id
- `SourcePaymentMethodId` - The legacy Source Payment Method Id
- `OrderId` - The legacy Order Id
- `ExpenseId` - The legacy Expense Id
- `SourceWalletId` - The Wallet id of the Source Wallet in case this 
- `expiryDate` - the date that this wallet will be no longer active
- `maxBalance` - max amount this wallet can spend
- `monthlyMaxBalance` - monthly amount that this wallet can spend
- `type` - type of the Wallet
- `description` - short description of the wallet

#### Enabling the endpoint

Go to the index in the [routes folder](https://github.com/opencollective/ledger/blob/master/server/routes/index.js) in the method setup routes. there you'll see

```js
 setupRoutes(app) {
    const models = fs.readdirSync(__dirname)
      .filter(file => {
        return (file.indexOf('.js') > -1)
        && file !== 'index.js'
        && file !== 'walletRouter.js' // this line can be removed to enable wallets endpoint
        && file !== 'abstractRouter.js';
      })
      .map((file) => {
        const model = require(path.join(__dirname, file));
        const newClass = new model(app);
        this.routers.push(newClass);
        return file;
      });
      this.routers.forEach(router => {
        router.setupRoutes();
      });
      this.logger.info(`Starting Routes : ${models}`);
}
```

then remove the line `&& file !== 'walletRouter.js'`. This way you'll enable all Wallets endpoints.

### GET /wallet

endpoint temporarily disable for security purposes(we do not want to create wallets through this endpoint at the moment).

#### Query Parameters:

- `id` - id of the wallet
- `AccountId` - The account that the wallet belongs to
- `OwnerAccountId`	- The Owner Account of the wallet
- `name` - name of the wallet
- `currency` - currency of the wallet
- `createdAt` - Date the transaction was created
- `updatedAt` - Date the transaction was updated

#### Enabling the endpoint

Go to the index in the [routes folder](https://github.com/opencollective/ledger/blob/master/server/routes/index.js) in the method setup routes. there you'll see

```js
 setupRoutes(app) {
    const models = fs.readdirSync(__dirname)
      .filter(file => {
        return (file.indexOf('.js') > -1)
        && file !== 'index.js'
        && file !== 'walletRouter.js' // this line can be removed to enable wallets endpoint
        && file !== 'abstractRouter.js';
      })
      .map((file) => {
        const model = require(path.join(__dirname, file));
        const newClass = new model(app);
        this.routers.push(newClass);
        return file;
      });
      this.routers.forEach(router => {
        router.setupRoutes();
      });
      this.logger.info(`Starting Routes : ${models}`);
}
```

then remove the line `&& file !== 'walletRouter.js'`. This way you'll enable all Wallets endpoints.

### API Documentation
Run `npm run doc` to see the available endpoints their requirements
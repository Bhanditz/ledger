#!/bin/sh

# beware - stopping all node PID processes
pkill -f node
# defining API PORT
PORT=3062
# defining DB_NAME
DB_NAME=opencollective_ledger_dvl

# recreating db
dropdb -U postgres $DB_NAME
createdb -U postgres $DB_NAME

# creating db schema
npm run db:migrate

# starting api on the background
PORT=$PORT npm run start &

# Wait until api has started
until $(curl --output /dev/null --silent --head --fail http://localhost:$PORT/transactions); do
    echo 'Waiting on API to be online...'
    sleep 20
done

# Run Curl commands

## create 2 accounts: marco(id 1) and xavier(id 2)
curl -H "Content-Type: application/json" -X POST --data '{"slug": "marco"}' http://localhost:$PORT/accounts 
curl -H "Content-Type: application/json" -X POST --data '{"slug": "xavier"}' http://localhost:$PORT/accounts 
## create 2 wallets for marco, 1 Credit card and multicurrency and 1 USD wallet
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 1, "currency": "multi", "name": "User1_CC"}' http://localhost:$PORT/wallets 
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 1, "currency": "USD", "name": "User1_USD"}' http://localhost:$PORT/wallets 

## create 2 wallets for xavier, 1 Credit card and multicurrency and 1 USD wallet
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 2, "currency": "multi", "name": "xavier_CC"}' http://localhost:$PORT/wallets 
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 2, "currency": "USD", "name": "xavier_USD"}' http://localhost:$PORT/wallets 

## setting default cashin and cashout wallets for both marco and xavier
curl -H "Content-Type: application/json" -X PUT --data '{"DefaultCashinWalletId": 1}' http://localhost:$PORT/accounts?id=1 
curl -H "Content-Type: application/json" -X PUT --data '{"DefaultCashoutWalletId": 1}' http://localhost:$PORT/accounts?id=1 
curl -H "Content-Type: application/json" -X PUT --data '{"DefaultCashinWalletId": 3}' http://localhost:$PORT/accounts?id=2 
curl -H "Content-Type: application/json" -X PUT --data '{"DefaultCashoutWalletId": 3}' http://localhost:$PORT/accounts?id=2 

## marco sends 30usd to xavier, generates 4 rows(2 for marco's cashin the 30usd to his wallet and 2 to send the money)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":1, "ToAccountId":2, "FromWalletId":2, "ToWalletId":4, "amount": 30, "currency": "USD"}' http://localhost:$PORT/transactions 

## xavier sends 15usd to marco, generates 2 rows(xavier wallet has already 30usd)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":2, "ToAccountId":1, "FromWalletId":4, "ToWalletId":2, "amount": 15, "currency": "USD"}' http://localhost:$PORT/transactions 
## xavier sends 15usd to marco, generates 2 rows(xavier wallet has already 15usd)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":2, "ToAccountId":1, "FromWalletId":4, "ToWalletId":2, "amount": 15, "currency": "USD"}' http://localhost:$PORT/transactions 
## xavier sends 15usd to marco, generates 4 rows(xavier has 0USd in his wallet so he cashes in first)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":2, "ToAccountId":1, "FromWalletId":4, "ToWalletId":2, "amount": 15, "currency": "USD"}' http://localhost:$PORT/transactions 

## In the end, we will have 12 rows:
### - 4 rows on marco sending 30usd to xavier (cashin Debit, cashin Credit, transfer Debit, transfer Credit)
### - 2 rows(Xavier has 30usd in that wallet) on xavier sending 15usd to marco(transfer Debit, transfer Credit)
### - 2 rows(Xavier has 15usd in that wallet) on xavier sending 15usd to marco(transfer Debit, transfer Credit)
### - 4 rows(Xavier has 0usd in that wallet) on xavier sending 15usd to marco(cashin Debit, cashin Credit, transfer Debit, transfer Credit)

# stopping api running on background
pkill -f node
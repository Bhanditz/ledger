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
curl -H "Content-Type: application/json" -X POST --data '{"slug": "marco"}' http://localhost:$PORT/accounts  | jq
curl -H "Content-Type: application/json" -X POST --data '{"slug": "xavier"}' http://localhost:$PORT/accounts | jq
## create 2 wallets for marco, 1 Credit card and multicurrency and 1 USD wallet
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 1, "currency": "multi", "name": "User1_CC"}' http://localhost:$PORT/wallets | jq
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 1, "currency": "USD", "name": "User1_USD"}' http://localhost:$PORT/wallets | jq

## create 2 wallets for xavier, 1 Credit card and multicurrency and 1 USD wallet
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 2, "currency": "multi", "name": "xavier_CC"}' http://localhost:$PORT/wallets | jq
curl -H "Content-Type: application/json" -X POST --data '{"OwnerAccountId": 2, "currency": "USD", "name": "xavier_USD"}' http://localhost:$PORT/wallets | jq

## marco cashes 30usd in , generates 2 rows(debit and credit)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":1, "ToAccountId":1, "FromWalletId":1, "ToWalletId":2, "amount": 30, "currency": "USD"}' http://localhost:$PORT/transactions | jq
## marco sends 30usd to xavier, generates 2 rows(debit and credit)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":1, "ToAccountId":2, "FromWalletId":2, "ToWalletId":4, "amount": 30, "currency": "USD"}' http://localhost:$PORT/transactions | jq

## xavier sends 15usd to marco, generates 2 rows(xavier wallet has already 30usd)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":2, "ToAccountId":1, "FromWalletId":4, "ToWalletId":2, "amount": 15, "currency": "USD"}' http://localhost:$PORT/transactions | jq
## xavier sends 15usd to marco, generates 2 rows(xavier wallet has already 15usd)
curl -H "Content-Type: application/json" -X POST --data '{"FromAccountId":2, "ToAccountId":1, "FromWalletId":4, "ToWalletId":2, "amount": 15, "currency": "USD"}' http://localhost:$PORT/transactions | jq


## In the end, we will have 8 rows:

# stopping api running on background
pkill -f node
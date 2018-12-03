#!/bin/sh

# defining API PORT
PORT=3062
# defining DB_NAME
DB_NAME=opencollective_ledger_test

# recreating db
./recreate_test.sh

# creating db schema
NODE_ENV=test npm run db:migrate && npm run db:seed
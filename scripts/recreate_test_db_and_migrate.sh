#!/bin/sh

# defining API PORT
PORT=3062
# defining DB_NAME
DB_NAME=opencollective_ledger_test

# recreating db
dropdb -U postgres $DB_NAME
createdb -U postgres $DB_NAME

# creating db schema
NODE_ENV=test npm run db:migrate && npm run db:seed
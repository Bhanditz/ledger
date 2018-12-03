#!/bin/sh

dropdb -U postgres $DB_NAME
createdb -U postgres $DB_NAME

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: `${process.env.NODE_ENV}.env` });

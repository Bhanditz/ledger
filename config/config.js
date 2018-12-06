export default {
  database: {
    database: process.env.DB_NAME || 'opencollective_prod_snapshot',
    url: process.env.DB_URL || 'postgres://opencollective@127.0.0.1:5432/opencollective_prod_snapshot',
    username: process.env.DB_USER || 'opencollective',
    port: parseInt(process.env.DB_PORT) || 5432,
    password: process.env.DB_PASS || '',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: process.env.DB_DIALECT || 'postgres',
    sslMode: parseToBoolean(process.env.DB_SSL_MODE) || false,
    poolMax: parseInt(process.env.DB_POOL_MAX) || 5,
    poolMin: parseInt(process.env.DB_POOL_MIN) || 0,
    poolIdle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    poolAcquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    logging: parseToBoolean(process.env.DB_LOGGING) || false,
  },
  skipWorkers: parseToBoolean(process.env.SKIP_WORKERS) || false,
  host: process.env.HOST || '127.0.0.1',
  port: process.env.PORT || 3070,
  queue: {
    url: process.env.QUEUE_URL || 'amqp://localhost',
    transactionQueue: process.env.TRANSACTION_QUEUE || 'transactions',
    failTransactionQueue: process.env.FAIL_TRANSACTION_QUEUE || 'fail_transactions',
    prefetchSize: parseInt(process.env.PREFETCH_SIZE) || 1,
  },
};

function parseToBoolean(value) {
  const lowerValue = value && value.trim().toLowerCase();
  if (['on', 'enabled', '1', 'true', 'yes', 1].includes(lowerValue)) {
    return true;
  }
  return false;
}

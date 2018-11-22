export default {
    database: {
        database: process.env.DB_NAME || 'opencollective_prod_snapshot',
        username: process.env.DB_USER || 'opencollective',
        port: process.env.DB_PORT || 5432,
        password: process.env.DB_PASSWORD || '',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: process.env.DB_DIALECT || 'postgres',
        sslMode: process.env.DB_SSL_MODE || false,
        poolMax: process.env.DB_POOL_MAX || 14,
        poolMin: process.env.DB_POOL_MIN || 0,
        poolIdle: process.env.DB_POOL_IDLE || 10000,
        poolAcquire: process.env.DB_POOL_ACQUIRE || 30000,
        logging: parseInt(process.env.DB_LOGGING) || 0,
    },
    skipWorkers: parseInt(process.env.SKIP_WORKERS) || 0,
    host: process.env.HOST || '0.0.0.0',
    port: process.env.PORT || 3060,
    queue: {
        url: process.env.QUEUE_URL || 'amqp://localhost',
        transactionQueue: process.env.TRANSACTION_QUEUE || 'transactions',
    },
};

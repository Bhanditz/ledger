export default {
    port: process.env.PORT || 3060,
    host: process.env.HOST || '0.0.0.0',
    database: {
        database: process.env.DB_NAME || 'opencollective_ledger_dvl',
        username: process.env.DB_USER || 'opencollective',
        password: process.env.DB_PASSWORD || '',
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: process.env.DB_DIALECT || 'postgres',
    },
};

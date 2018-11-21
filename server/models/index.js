import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import config from '../../config/config';

export default class Database {
  constructor() {
    if (!this.sequelize) {
      this.sequelize = new Sequelize(config.database.database, config.database.username, config.database.password, {
        host: config.database.host,
        dialect: config.database.dialect,
        dialectOptions: {
          ssl: config.database.sslMode,
        },
        port: config.database.port,
        logging: false,
        pool: {
          max: 100,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });
    }
    if (!this.models) {
      this.models = Object.assign({}, ...fs.readdirSync(__dirname)
        .filter(file => (file.indexOf('.js') > -1) && (file !== 'index.js'))
        .map((file) => {
          const model = require(path.join(__dirname, file));
          return { [model.name]: model.init(this.sequelize) };
        })
      );
      for (const model of Object.keys(this.models)) {
        typeof this.models[model].associate === 'function' && this.models[model].associate(this.models);
      }
    }
  }
}

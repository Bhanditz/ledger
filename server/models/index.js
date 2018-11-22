import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import config from '../../config/config';

/* Database Singleton
*/
let _database = null;

export default class Database {
  constructor () {
    // initiating db singleton
    if (!_database) {
      // starting sequelize db connections
      if (!this.sequelize) {
        this.startDatabase();
      }
      // looking for db models
      if (!this.models) {
        this.findDatabaseModels();
      }
      _database = this;
    }
    return _database;
  }

  startDatabase() {
    const options = {
      host: config.database.host,
      dialect: config.database.dialect,
      dialectOptions: {
        ssl: config.database.sslMode,
      },
      port: config.database.port,
      pool: {
        max: config.database.poolMax,
        min: config.database.poolMin,
        acquire: config.database.poolAcquire,
        idle: config.database.poolIdle,
      },
      logging: config.database.logging ? console.log : false,
    };
    this.sequelize = new Sequelize(
      config.database.database,
      config.database.username,
      config.database.password,
      options
    );
  }

  findDatabaseModels() {
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

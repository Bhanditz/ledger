
import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import config from '../../config/config';
export let sequelize = null, models = null;

export default class Database {
  constructor() {
    if (!sequelize) {
      sequelize = new Sequelize(config.database.database, config.database.username, config.database.password, {
        dialect: config.database.dialect,
        logging: false,
      });
    }
    if (!models) {
      models = Object.assign({}, ...fs.readdirSync(__dirname)
        .filter(file => (file.indexOf('.js') > -1) && (file !== 'index.js'))
        .map((file) => {
          const model = require(path.join(__dirname, file));
          return { [model.name]: model.init(sequelize) };
        })
      );
      for (const model of Object.keys(models)) {
        typeof models[model].associate === 'function' && models[model].associate(models);
      }
    }
  }
}

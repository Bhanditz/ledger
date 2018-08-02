
import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import config from '../../config/config';


const sequelize = new Sequelize(config.database.database, config.database.username, config.database.password, {
  dialect: config.database.dialect,
  logging: false,
});

// Load all models present in the model directory
const models = Object.assign({}, ...fs.readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .map((file) => {
    const model = require(path.join(__dirname, file));
    return { [model.name]: model.init(sequelize) };
  })
);

// Load all model associations
for (const model of Object.keys(models)) {
  typeof models[model].associate === 'function' && models[model].associate(models);
}

export default models;

import fs from 'fs';
import path from 'path';

export default class ResetDb {
  static async run() {
    const models = Object.assign({}, ...fs.readdirSync(path.join(__dirname, '../models'))
      .filter(file => (file.indexOf('.js') > -1) && (file !== 'index.js'))
      .map((file) => {
        const model = require(path.join(__dirname, `../models/${file}`));
        return { [model.name]: model };
      })
    );
    for (const model of Object.keys(models)) {
      await models[model].sync({ force: true });
    }
  }
}

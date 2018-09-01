// import fs from 'fs';
// import path from 'path';
import Database from '../server/models';


export default class ResetDb {
  static async run() {
    const db = new Database();
    console.log(`models: ${JSON.stringify(Object.keys(db.models))}`);
    for (const model of Object.keys(db.models)) {
      await db.models[model].sync({ force: true });
      // typeof this.models[model].associate === 'function' && this.models[model].associate(this.models);
    }
    // const models = Object.assign({}, ...fs.readdirSync(path.join(__dirname, '../server/models'))
    //   .filter(file => (file.indexOf('.js') > -1) && (file !== 'index.js'))
    //   .map((file) => {
    //     const model = require(path.join(__dirname, `../server/models/${file}`));
    //     return { [model.name]: model };
    //   })
    // );
    // console.log(`models: ${JSON.stringify(Object.keys(models))}`);
    // for (const model of Object.keys(models)) {
    //   console.log(`before sync model: ${JSON.stringify(models[model].toString())}`);
    //   await models[model].sync({ force: true });
    //   console.log(`after sync model: ${JSON.stringify(models[model].toString())}`);
    // }
  }
}

import Database from '../server/models';
import config from '../config/config';

export default class ResetDb {
  static async run() {
    const db = new Database();
    for (const model of Object.keys(db.models)) {
      if (model.toString() === 'Wallet') {
        await db.sequelize.query('DELETE FROM "Wallets";');
      } else {
        await db.models[model].sync({ force: true });
      }
    }
    return true;
  }
}

import Database from '../server/models';

export default class ResetDb {
  static async run() {
    const db = new Database();
    for (const model of Object.keys(db.models)) {
      if (model.toString() === 'Account') {
        await db.sequelize.query('DELETE FROM "Accounts";');
      } else if (model.toString() === 'Wallet') {
        await db.sequelize.query('DELETE FROM "Wallets";');
      } else {
        await db.models[model].sync({ force: true });
      }
    }
    return true;
  }
}

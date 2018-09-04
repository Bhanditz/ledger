// import fs from 'fs';
// import path from 'path';
import Database from '../server/models';
import PlatformInfo from '../server/globals/platformInfo';

export default class ResetDb {
  static async run() {
    const db = new Database();
    for (const model of Object.keys(db.models)) {
      if (model.toString() === 'Account') {
        const account = await PlatformInfo.getAccount();
        await db.sequelize.query(`DELETE FROM "Accounts" WHERE "id"!=${account.id};`);
      } else if (model.toString() === 'Wallet') {
        const wallet = await PlatformInfo.getWallet();
        await db.sequelize.query(`DELETE FROM "Wallets" WHERE "id"!=${wallet.id};`);
      } else {
        await db.models[model].sync({ force: true });
      }
    }
    return true;
  }
}

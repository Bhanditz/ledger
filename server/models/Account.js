import Sequelize from 'sequelize';

export default class Account extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      slug: Sequelize.STRING,
      DefaultCashinWalletId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { key: 'id', model: 'Wallets' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      DefaultCashoutWalletId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { key: 'id', model: 'Wallets' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      deletedAt: {
        type: Sequelize.DATE,
      },
    }, { sequelize });
  }
}

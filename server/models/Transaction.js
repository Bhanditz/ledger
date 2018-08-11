import Sequelize from 'sequelize';

export default class Transaction extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      FromAccountId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Accounts' },
        allowNull: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ToAccountId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Accounts' },
        allowNull: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      FromWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ToWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: true,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.FLOAT,
      },
      TransactionGroup: {
        type: Sequelize.UUID,
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD',
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

  static associate(models) {
    this.belongsTo(models.Account, { foreignKey: 'FromAccountId', as: 'fromAccount' });
    this.belongsTo(models.Account, { foreignKey: 'ToAccountId', as: 'toAccount' });
    this.belongsTo(models.Wallet, { foreignKey: 'FromWalletId', as: 'fromWallet' });
    this.belongsTo(models.Wallet, { foreignKey: 'ToWalletId', as: 'toWallet' });
  }

}

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
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ToAccountId: {
      type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Accounts' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      WalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      PaymentProviderId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'PaymentProviders' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.FLOAT,
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
    this.belongsTo(models.Wallet, { foreignKey: 'WalletId', as: 'wallet' });
    this.belongsTo(models.PaymentProvider, { foreignKey: 'PaymentProviderId', as: 'paymentProvider' });
  }

}

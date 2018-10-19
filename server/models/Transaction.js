import Sequelize from 'sequelize';
import transactionTypeEnum from '../globals/enums/transactionTypeEnum';

export default class Transaction extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: Sequelize.ENUM,
        allowNull: false,
        values: Object.values(transactionTypeEnum),
      },
      FromAccountId: {
        type: Sequelize.STRING,
      },
      FromWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ToAccountId: {
        type: Sequelize.STRING,
      },
      ToWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: {
        type: Sequelize.FLOAT,
      },
      transactionGroupId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      transactionGroupSequence: {
        type: Sequelize.INTEGER,
      },
      doubleEntryGroupId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD',
      },
      category: {
        type: Sequelize.STRING,
      },
      LegacyTransactionId: {
        type: Sequelize.INTEGER,
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
  /**
   * responsible to associate the model relationships
   * @param {*} models - sequelize models
   */
  static associate(models) {
    this.belongsTo(models.Wallet, { foreignKey: 'FromWalletId', as: 'fromWallet' });
    this.belongsTo(models.Wallet, { foreignKey: 'ToWalletId', as: 'toWallet' });
  }
}

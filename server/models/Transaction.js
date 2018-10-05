import Sequelize from 'sequelize';
import { transactionTypeEnum } from '../globals/enums/transactionTypeEnum';

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
      FromWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      transactionGroupTotalAmount: {
        type: Sequelize.FLOAT,
      },
      transactionGroupTotalAmountInDestinationCurrency: {
        type: Sequelize.FLOAT,
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
    this.belongsTo(models.Account, { foreignKey: 'FromAccountId', as: 'fromAccount' });
    this.belongsTo(models.Account, { foreignKey: 'ToAccountId', as: 'toAccount' });
    this.belongsTo(models.Wallet, { foreignKey: 'FromWalletId', as: 'fromWallet' });
    this.belongsTo(models.Wallet, { foreignKey: 'ToWalletId', as: 'toWallet' });
  }

}

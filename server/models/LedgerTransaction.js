import Sequelize from 'sequelize';
import transactionTypeEnum from '../globals/enums/transactionTypeEnum';

export default class LedgerTransaction extends Sequelize.Model {
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
        type: Sequelize.INTEGER,
      },
      currency: {
        type: Sequelize.STRING,
      },
      description: {
        type: Sequelize.STRING,
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
      category: {
        type: Sequelize.STRING,
      },
      forexRate: {
        type: Sequelize.FLOAT,
      },
      forexRateSourceCoin: {
        type: Sequelize.STRING,
      },
      forexRateDestinationCoin: {
        type: Sequelize.STRING,
      },
      LegacyCreditTransactionId: {
        type: Sequelize.INTEGER,
      },
      LegacyDebitTransactionId: {
        type: Sequelize.INTEGER,
      },
      RefundTransactionId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'LedgerTransactions' },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'SET NULL',
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

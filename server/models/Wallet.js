import Sequelize from 'sequelize';

export default class Wallet extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
      },
      AccountId: {
        type: Sequelize.STRING, // CollectiveId field(current prod "Collective" table that will be renamed to account)
        allowNull: false,
      },
      OwnerAccountId: {
        type: Sequelize.STRING, // HostCollectiveId field(current prod "Collective" table that will be renamed to account)
        allowNull: false,
      },
      PaymentMethodId: {
        type: Sequelize.INTEGER,
      },
      SourcePaymentMethodId: {
        type: Sequelize.INTEGER,
      },
      OrderId: {
        type: Sequelize.INTEGER,
      },
      ExpenseId: {
        type: Sequelize.INTEGER,
      },
      SourceWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        description: 'References the Wallet used to actually pay through this gift card',
      },
      temporary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
      expiryDate: {
        type: Sequelize.DATE,
      },
      maxBalance: {
        type: Sequelize.INTEGER,
        description: 'some wallets may have limited budget',
      },
      monthlyMaxBalance: {
        type: Sequelize.INTEGER,
        description: 'some wallets may have monthly limited budget',
      },
    },
    {
      sequelize,
      indexes: [
          {
            unique: true,
            fields: ['name', 'currency', 'AccountId', 'OwnerAccountId'],
          },
      ],
    });
  }

  /**
   * responsible to associate the model relationships
   * @param {*} models - sequelize models
   */
  static associate(models) {
    this.belongsTo(models.Wallet, { foreignKey: 'SourceWalletId', as: 'sourceWallet' });
  }
}

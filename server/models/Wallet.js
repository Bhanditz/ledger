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
        defaultValue: 'USD',
      },
      OwnerAccountId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Accounts' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      ProviderId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: { key: 'id', model: 'Providers' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
    }, {
      sequelize,
    });
  }
  /**
   * responsible to associate the model relationships
   * @param {*} models - sequelize models
   */
  static associate(models) {
    this.belongsTo(models.Account, { foreignKey: 'OwnerAccountId', as: 'ownerAccount' });
    this.hasOne(models.Provider, {
      foreignKey: {
        name: 'ProviderId',
        allowNull: true,
      },
      as: 'provider',
    });
  }
}

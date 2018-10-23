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
}

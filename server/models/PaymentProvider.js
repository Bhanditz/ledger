import Sequelize from 'sequelize';

export default class PaymentProvider extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: Sequelize.STRING,
      type: Sequelize.STRING,
      percentageFee: Sequelize.FLOAT,
      fixedFee: Sequelize.FLOAT,
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

  // static associate(models) {
  // }
}

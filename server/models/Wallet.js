import Sequelize from 'sequelize';
import { paymentMethodServices } from '../globals/enums/paymentMethodServices';
import WalletUtil from '../lib/walletUtil';
import { operationNotAllowed } from '../globals/errors';

export default class Wallet extends Sequelize.Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      paymentMethodService: {
        type: Sequelize.STRING,
        validate: {
          isIn: [Object.entries(paymentMethodServices).map(pm => pm[1].name)],
        },
        allowNull: false,
      },
      paymentMethodType: {
        type: Sequelize.STRING,
        validate: {
          isIn: [[].concat([], ...Object.entries(paymentMethodServices).map(pm => Object.values(pm[1].types)))],
        },
        allowNull: false,
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
      hooks: {
        beforeCreate: (wallet) => {
          // Validate if Payment type is in the right service
          if (!WalletUtil.IsPaymentMethodTypeInCorrectService(wallet.paymentMethodService, wallet.paymentMethodType)) {
              throw Error(operationNotAllowed(`Payment Method type ${wallet.paymentMethodType} ` +
                `is not part of Service ${wallet.paymentMethodService}`));
            }
        },
      },
      sequelize,
    });
  }
  /**
   * responsible to associate the model relationships
   * @param {*} models - sequelize models
   */
  static associate(models) {
    this.belongsTo(models.Account, { foreignKey: 'OwnerAccountId', as: 'ownerAccount' });
  }
}

import Sequelize from 'sequelize';
import { paymentMethodServices } from '../globals/enums/paymentMethodServices';
import { operationNotAllowed } from '../globals/errors';
import WalletLib from '../lib/walletLib';

export default class Provider extends Sequelize.Model {
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
      service: {
        type: Sequelize.STRING,
        validate: {
          isIn: [Object.entries(paymentMethodServices).map(pm => pm[1].name)],
        },
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        validate: {
          isIn: [[].concat([], ...Object.entries(paymentMethodServices).map(pm => Object.values(pm[1].types)))],
        },
        allowNull: false,
      },
      fixedFee: {
        type: Sequelize.FLOAT,
      },
      percentFee: {
        type: Sequelize.FLOAT,
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
        beforeCreate: (provider) => {
          // provider needs to define at least one of the fees
          // if (!provider.fixedFee && !provider.percentFee) {
          //   throw Error(operationNotAllowed('A provider needs to define at least one fee'));
          // }
          // Validate if Payment type is in the right service
          if (!WalletLib.isPaymentMethodTypeInCorrectService(provider.service, provider.type)) {
              throw Error(operationNotAllowed(`Payment Method type ${provider.type} ` +
                `is not part of Service ${provider.service}`));
          }
        },
      },
      sequelize,
    });
  }
}

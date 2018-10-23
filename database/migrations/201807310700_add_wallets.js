module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Wallets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING,
      },
      AccountId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      OwnerAccountId: {
        type: Sequelize.STRING,
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
        defaultValue: Sequelize.literal('NOW()')
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()')
      },
      deletedAt: {
        type: Sequelize.DATE
      },
    }, {
      indexes: [
          {
            unique: true,
            fields: ['name', 'currency', 'AccountId', 'OwnerAccountId'],
          },
      ],
      timestamps: true,
    })
    .then( () => {
      return queryInterface.addConstraint('Wallets', ['name', 'currency', 'AccountId', 'OwnerAccountId'], {
        type: 'unique',
        name: 'wallets_pkey'
      });
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('Wallets');
  }
};

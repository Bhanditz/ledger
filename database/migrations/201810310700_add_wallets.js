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
      OrderId: {
        type: Sequelize.INTEGER,
      },
      ExpenseId: {
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
      timestamps: true,
    })
    .then( () => {
      return queryInterface.addConstraint('Wallets', ['name', 'currency', 'AccountId', 'OwnerAccountId'], {
        type: 'unique',
        name: 'wallets_constraint_uniq'
      });
    }).then( () => {
      return queryInterface.addIndex('Wallets', {
        fields: ['AccountId', 'OwnerAccountId'],
        name: 'ledger_wallet_idx_account_owner'
      });
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('Wallets');
  }
};

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      /* BY Some reason Sequelize was throwing error when trying to create tables with
         References */
      FromAccountId: {
        type: Sequelize.INTEGER,
        references: {key: 'id', model: 'Accounts'},
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      ToAccountId: {
      type: Sequelize.INTEGER,
        references: {key: 'id', model: 'Accounts'},
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      WalletId: {
        type: Sequelize.INTEGER,
        references: {key: 'id', model: 'Wallets'},
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      PaymentProviderId: {
        type: Sequelize.INTEGER,
        references: {key: 'id', model: 'PaymentProviders'},
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      amount: {
        type: Sequelize.FLOAT,
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      deletedAt: {
        type: Sequelize.DATE
      },
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('Transactions');
  }
};

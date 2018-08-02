module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Wallets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD'
      },
      /* BY Some reason Sequelize was throwing error when trying to create tables with
         References */
      OwnerAccountId: {
        type: Sequelize.INTEGER,
        references: {key: 'id', model: 'Accounts'},
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
    return queryInterface.dropTable('Wallets');
  }
};

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
        defaultValue: 'USD'
      },
      OwnerAccountId: {
        type: Sequelize.STRING,
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
      indexes: [
          {
              unique: true,
              fields: ['name', 'currency', 'OwnerAccountId'],
          },
      ],
    });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('Wallets');
  }
};

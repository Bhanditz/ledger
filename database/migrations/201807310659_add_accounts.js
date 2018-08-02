module.exports = {
  up: (queryInterface, Sequelize) => {
    // Within the Accounts Model we would Have different types of accounts:
    // Collectives, Users, Organizations, etc...
    return queryInterface.createTable('Accounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'USD'
      },
      slug: Sequelize.STRING,
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
    return queryInterface.dropTable('Accounts');
  }
};

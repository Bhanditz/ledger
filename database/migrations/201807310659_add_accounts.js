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
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      DefaultCashinWalletId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      DefaultCashoutWalletId: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
    }, { timestamps: true, });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('Accounts');
  }
};

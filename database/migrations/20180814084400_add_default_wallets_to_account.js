module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Accounts', 'DefaultCashinWalletId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {key: 'id', model: 'Wallets'},
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    })
    .then(function() {
      queryInterface.addColumn('Accounts', 'DefaultCashoutWalletId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {key: 'id', model: 'Wallets'},
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })
    });    
  },

  down: (queryInterface) => {
    return Promise.resolve(true);
  }
};

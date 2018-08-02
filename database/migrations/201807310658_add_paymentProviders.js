module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('PaymentProviders', { // await
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: Sequelize.STRING,
      type: Sequelize.STRING,
      // Extras imo may be a good idea to store fees in Db instead of having constants
      // If fees can be even more complex we could have a separate model as well.
      percentageFee: Sequelize.FLOAT,
      fixedFee: Sequelize.FLOAT,
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
    
    /* TODO: Add indices to all Tables
    .then(()=>{
      return queryInterface.addIndex('PaymentProviders', ['name'], {
        indexName: 'PaymentProviders_namefkey',
        indicesType: 'UNIQUE'
      });
    }).then(()=>{
      return queryInterface.addIndex('PaymentProviders', ['type'], {
        indexName: 'PaymentProviders_typefkey',
        indicesType: 'FULLTEXT'
      });
    })*/
    // await queryInterface.addIndex('PaymentProviders', ['name'], {
    //   indexName: 'PaymentProviders_namefkey',
    //   indicesType: 'UNIQUE'
    // });
    // return queryInterface.addIndex('PaymentProviders', ['type'], {
    //   indexName: 'PaymentProviders_typefkey',
    //   indicesType: 'FULLTEXT'
    // });
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('PaymentProviders');
  }
};

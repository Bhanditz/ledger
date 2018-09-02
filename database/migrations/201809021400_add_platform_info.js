// Move to Seeders folder later, was getting "Validation error" bug there: 
// https://github.com/sequelize/cli/issues/322
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Accounts', [{
      slug: 'platform',
    }], {});
    await queryInterface.bulkInsert('Providers', [{
      name: 'platform_provider',
      fixedFee: 0,
      percentFee: 0.05,
      service: 'OPENCOLLECTIVE',
      type: 'COLLECTIVE',
    }], {}); 
    await queryInterface.bulkInsert('Wallets', [{
      OwnerAccountId: 1,
      currency: 'USD',
      name: 'platform_USD',
      ProviderId: 1,
    }], {}); 
    return Promise.resolve(true);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.resolve(true);
  }
};

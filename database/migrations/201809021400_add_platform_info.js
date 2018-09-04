// Move to Seeders folder later, was getting "Validation error" bug there: 
// https://github.com/sequelize/cli/issues/322
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Accounts', [{
      slug: 'platform',
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {});
    // the raw account result weirdly has the rows in an array of another array.
    const allAccounts = await queryInterface.sequelize.query('SELECT * FROM "Accounts"');
    const platformAccount = allAccounts[0][0];
    await queryInterface.bulkInsert('Providers', [{
      name: 'platform_provider',
      fixedFee: 0,
      percentFee: 0.05,
      service: 'OPENCOLLECTIVE',
      type: 'COLLECTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      OwnerAccountId: platformAccount.id,
    }], {}); 
    // the raw account result weirdly has the rows in an array of another array.
    const allProviders = await queryInterface.sequelize.query('SELECT * FROM "Providers"');
    const platformProvider = allProviders[0][0];
    // we create a Wallet with NO provider ID which(means it's already a Provider Wallet)
    await queryInterface.bulkInsert('Wallets', [{
      OwnerAccountId: platformAccount.id,
      currency: 'USD',
      name: 'platform_USD',
      ProviderId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }], {}); 
    return Promise.resolve(true);
  },

  down: (queryInterface, Sequelize) => {
    return Promise.resolve(true);
  }
};

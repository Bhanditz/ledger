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
      SourcePaymentMethodId: {
        type: Sequelize.INTEGER,
      },
      OrderId: {
        type: Sequelize.INTEGER,
      },
      ExpenseId: {
        type: Sequelize.INTEGER,
      },
      SourceWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: true,
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        description: 'References the Wallet used to actually pay through this gift card',
      },
      temporary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        description: 'intermediary wallets that work as aux wallets on forex transactions',
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
      expiryDate: {
        type: Sequelize.DATE,
      },
      maxBalance: {
        type: Sequelize.INTEGER,
        description: 'some wallets may have limited budget',
      },
      monthlyMaxBalance: {
        type: Sequelize.INTEGER,
        description: 'some wallets may have monthly limited budget',
      }
    }, {
      timestamps: true,
    })
    .then( () => {
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

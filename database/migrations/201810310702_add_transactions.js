module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('LedgerTransactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      type: {
        type: Sequelize.ENUM,
        allowNull: false,
        values: ['CREDIT', 'DEBIT'],
      },
      FromAccountId: {
        type: Sequelize.STRING,
      },
      FromWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      ToAccountId: {
        type: Sequelize.STRING,
      },
      ToWalletId: {
        type: Sequelize.INTEGER,
        references: { key: 'id', model: 'Wallets' },
        allowNull: false,
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      amount: {
        type: Sequelize.INTEGER,
      },
      currency: {
        type: Sequelize.STRING,
      },
      transactionGroupId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      transactionGroupSequence: {
        type: Sequelize.INTEGER,
      },
      doubleEntryGroupId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
      },
      forexRate: {
        type: Sequelize.FLOAT,
      },
      forexRateSourceCoin: {
        type: Sequelize.STRING,
      },
      forexRateDestinationCoin: {
        type: Sequelize.STRING,
      },
      LegacyTransactionId: {
        type: Sequelize.INTEGER,
      },
      RefundTransactionId: {
        type: Sequelize.INTEGER,
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
    }, 
    { 
      timestamps: true 
    }).then( () => {
      return queryInterface.addConstraint('LedgerTransactions', ['transactionGroupSequence', 'LegacyTransactionId'], {
        type: 'unique',
        name: 'ledger_transactions_constraint_uniq'
      });
    }).then( () => {
      return queryInterface.addIndex('LedgerTransactions', {
        fields: ['transactionGroupId', 'LegacyTransactionId'],
        name: 'ledger_tx_idx_group_legacytx'
      });
    });

  },

  down: (queryInterface) => {
    return queryInterface.dropTable('LedgerTransactions');
  }
};

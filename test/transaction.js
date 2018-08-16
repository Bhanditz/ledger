/**
 * Test around the @{TransactionService}
 *
 * @module test/user/service
 */
import server from '../server';
import { expect } from 'chai';
import sinon from 'sinon';
import models, { sequelize } from '../server/models';
import TransactionService from '../server/services/transactionService';

describe('Transaction - TransactionService  - ', () => {
  // Basic configuration: create a sinon sandbox for testing
  let sandbox = null;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox && sandbox.restore();
  });

  it('the service shall exist', () => {
    expect(TransactionService).to.exist;
  });
  it('exist', () => {
    const service = new TransactionService();
    expect(service.get).to.exist;
  });

  it('shall returns an empty array of transactions', () => {
    const service = new TransactionService();
    return service.get().then((transactions) => {
      expect(transactions).deep.equals([]);
    });
  });
});

import models from '../models';

export default (app) => {
  app.get('/transactions', (req, res) => {
    models.Transaction.findAll().then(transactions => {
      res.send({ transactions: transactions });
    });
  });
};

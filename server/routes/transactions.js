// import express from 'express';
// const router = express.Router();

// router.get('/', (req, res, next) => {
//   res.send({ transactions: [] });
// });

// export default router;

export default (app) => {
  app.get('/transactions', (req, res) => {
    res.send({ transactions: [] });
  });
};

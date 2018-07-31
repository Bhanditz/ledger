export default (app) => {
  app.get('/ping', (req, res) => {
    res.send({ pong: true });
  });
};

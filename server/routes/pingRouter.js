import AbstractRouter from './abstractRouter';

export default class PingRouter extends AbstractRouter {

  constructor(app) {
    super(app);
  }

  /**
   * @api {get} /ping Health Check endpoint
   * @apiName Ledger
   * @apiGroup Ping
   *
   */
  get() {
    this.app.get('/ping', (req, res) => {
      res.send({ pong: true });
    });
  }
  post() {}
}

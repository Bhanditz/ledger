import './globals/setEnvironment';
import express from 'express';
import { Router } from './routes';
import os from 'os';
import Database from './models';
import pino from 'express-pino-logger';
import Logger from './globals/logger';
export let app = null;

export default class App {
  constructor() {
    this.database = new Database();
    this.logger = new Logger();
    app = express();
    app.use(express.json());
    app.use(pino());
    app.routers = new Router(app);
    app.models = this.database.models;
    this.startServer();
  }

  startServer() {
    /**
     * Start server
     */
    const server = app.listen(process.env.PORT, process.env.HOST, () => {
      const host = os.hostname();
      this.logger.info(`Open Collective API listening at http://${host}:${server.address().port} in ${app.set('env')} environment.\n`);
    });
  }
}

new App();

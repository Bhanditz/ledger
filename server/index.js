import express from 'express';
import { Router } from './routes';
import os from 'os';
import config from '../config/config';
import models from './models';
import pino from 'express-pino-logger';
import Logger from './globals/logger';

const logger  = new Logger();
const app = express();
app.use(express.json());
app.use(pino());
app.routers = new Router(app);
app.models = models;
/**
 * Start server
 */
const server = app.listen(config.port, config.host, () => {
  const host = os.hostname();
  logger.info(`Open Collective API listening at http://${host}:${server.address().port} in ${app.set('env')} environment.\n`);
});

export default app;

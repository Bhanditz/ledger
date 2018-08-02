import express from 'express';
import { Router } from './routes';
import os from 'os';
import config from '../config/config';
import models from './models';

const app = express();
app.routers = new Router(app);
app.models = models;
/**
 * Start server
 */
const server = app.listen(config.port, config.host, () => {
  const host = os.hostname();
  console.log('Open Collective API listening at http://%s:%s in %s environment.\n', host, server.address().port, app.set('env'));
});

export default app;

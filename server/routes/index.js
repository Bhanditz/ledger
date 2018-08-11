import fs from 'fs';
import path from 'path';
import Logger from '../globals/logger';

export class Router {

  constructor(app) {
    this.routers = [];
    this.logger = new Logger();
    // Load all routers present in the routes directory(other than abstractRouter)
    this.setupRoutes(app);
  }

  setupRoutes(app) {
    const models = fs.readdirSync(__dirname)
      .filter(file => {
        return (file.indexOf('.js') > -1)
        && file !== 'index.js'
        && file !== 'abstractRouter.js';
      })
      .map((file) => {
        const model = require(path.join(__dirname, file));
        const newClass = new model(app);
        this.routers.push(newClass);
        return file;
      });
      this.routers.forEach(router => {
        router.setupRoutes();
      });
      this.logger.info(`Starting Routes : ${models}`);
  }

}

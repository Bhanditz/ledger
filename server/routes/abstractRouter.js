import { validationResult } from 'express-validator/check';
import HttpStatus from 'http-status-codes';
import Logger from '../globals/logger';

export default class AbstractRouter {
  constructor(app, service, path, validator) {
    this.app = app;
    this.service = service;
    this.path = `/${path}`;
    this.validator = validator;
    this.logger = new Logger();
  }

  setupRoutes() {
    this.get();
    this.post();
    this.put();
    this.delete();
  }

  get() {
    this.app.get(this.path, (req, res) => {
      this.service.get(req.query).then( data => {
        res.send({ data: data });
      }).catch(error => {
        this.logger.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error);
      });
    });
  }

  post() {
    this.app.post(this.path, this.validator ? this.validator.post() : [], (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
      }
      this.service.create(req.body).then( data => {
        res.send({ data: data });
      }).catch(error => {
        this.logger.error(error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(error);
      });
    });
  }

  put() {}
  delete() {}
}

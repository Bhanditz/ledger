import Pino from 'pino';
let _instance = null;

export default class Logger {

  constructor() {
    if (!_instance) {
      _instance = this;
      this.logger = new Pino();
    }
    return _instance;
  }

  trace(data, msg = '') {
    this.logger.trace(data, msg);
  }

  debug(data, msg = '') {
    this.logger.debug(data, msg);
  }

  info(data, msg = '') {
    this.logger.info(data, msg);
  }

  warn(data, msg = '') {
    this.logger.warn(data, msg);
  }

  error(data, msg = '') {
    this.logger.error(data, msg);
  }
}

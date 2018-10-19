import Database from '../models';
import Logger from '../globals/logger';

export default class AbstractCrudService {

  constructor(model) {
    this.database = new Database();
    this.model = model;
    this.logger = new Logger();
  }

  get(query = {}) {
    return this.model.findAll({ where: query });
  }

  getOne(query = {}) {
    return this.model.findOne({ where: query });
  }

  insert(data) {
    return this.model.create(data);
  }

  update(data, query) {
    return this.model.update(data,{ where: query });
  }

  delete(query) {
    return this.model.destroy({
      where: {
          query,
      },
    });
  }
}

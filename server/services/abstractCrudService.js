import Database from '../models';

export default class AbstractCrudService {

  constructor(model) {
    this.database = new Database();
    this.model = model;
  }

  get(query = {}) {
    return this.model.findAll({ where: query });
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

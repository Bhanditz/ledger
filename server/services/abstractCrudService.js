export default class AbstractCrudService {

  constructor(model) {
    this.model = model;
  }

  get(query) {
    return this.model.findAll(query);
  }

  create(data) {
    return this.model.create(data);
  }

  put(data, query) {
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

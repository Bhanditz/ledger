import Database from '../models';
import Logger from '../globals/logger';
import LRU from 'lru-cache';

export default class AbstractCrudService {

  constructor(model) {
    this.database = new Database();
    this.model = model;
    this.logger = new Logger();
    this.cache = new LRU({
      max: 10000,
      maxAge: 1000 * 60 * 10, // we keep it max 10 min
    });
  }

  async get(query = {}) {
    // const key = `${this.model.name}_${JSON.stringify(query)}_all`;
    // const cacheItem = this.cache.get(key);
    // if (cacheItem) {
    //   return cacheItem;
    // }
    const { where, include, ...regularQuery } = query;
    let modelQuery = { where: regularQuery, order: [['createdAt', 'DESC']] };
    if (where) {
      if (query.where.or) {
        const Op = this.database.sequelize.Op;
        query.where = {
          ...query.where,
          [Op.or]: query.where.or,
        };
        delete query.where.or;
      }
      query.order = [['createdAt', 'DESC']];
      modelQuery = query;
    }
    if (include) {
      modelQuery.include = include;
    }
    const result = await this.model.findAll(modelQuery);
    // this.cache.set(key, result);
    return result;
  }

  getOne(query = {}) {
    // const key = `${this.model.name}_${JSON.stringify(query)}_one`;
    // const cacheItem = this.cache.get(key);
    // if (cacheItem) {
    //   return cacheItem;
    // }
    return this.model.findOne({ where: query })
    .then(result => {
      // this.cache.set(key, result);
      return result;
    }).catch(error => {
      throw error;
    });
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

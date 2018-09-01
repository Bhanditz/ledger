import AbstractCrudService from './abstractCrudService';
import Provider from '../models/Provider';

export default class ProviderService extends AbstractCrudService {
  constructor() {
    super(Provider);
  }
}

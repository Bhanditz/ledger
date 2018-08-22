import fs from 'fs';
import { get } from 'lodash';
import path from 'path';

export default class AbstractPaymentMethod {
  
  constructor(type, pmPath) {
    // Find all possible types for the payment method
    this.types = Object.assign({}, ...fs.readdirSync(pmPath)
      .filter(file => (file.indexOf('.js') > -1) && (file !== 'index.js'))
      .map((file) => {
        const model = require(pmPath.join(path, file));
        return model;
      })
    );
    // Check whether the type param is allowed for this payment method
    const matchingType = this.types.filter(pmType => (type instanceof pmType));  
    if (matchingType.length <= 0) 
      throw Error(`Payment method does not have type ${get(type, 'constructor.name')}`)

    this.type = type;  
  }

  processOrder(order) {
    return this.type.processOrder(order);
  }

}

import setPingRoute from './ping';
import setTransactionsRoutes from './transactions';

export class Router {

  constructor(app) {
    setPingRoute(app);
    setTransactionsRoutes(app);
  }

}

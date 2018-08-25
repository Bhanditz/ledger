export const paymentMethodServices = Object.freeze({
  opencollective: {
    name: 'OPENCOLLECTIVE',
    types: {
      COLLECTIVE: 'COLLECTIVE',
      GIFTCARD: 'GIFTCARD',
      PREPAID: 'PREPAID',
    },
  },
  paypal: {
    name: 'PAYPAL',
    types: {
      ADAPTIVE: 'ADAPTIVE',
      PAYMENT: 'PAYMENT',
    },
  },
  stripe: {
    name: 'STRIPE',
    types: {
      CREDITCARD: 'CREDITCARD',
    },
  },
});

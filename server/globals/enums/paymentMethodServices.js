export const paymentMethodServices = Object.freeze({
  opencollective: {
    name: 'OPENCOLLECTIVE',
    types: [
      'COLLECTIVE',
      'GIFTCARD',
      'PREPAID',
    ],
  },
  paypal: {
    name: 'PAYPAL',
    types: [
      'ADAPTIVE',
      'PAYMENT',
    ],
  },
  stripe: {
    name: 'STRIPE',
    types: [
      'CREDITCARD',
    ],
  },
});

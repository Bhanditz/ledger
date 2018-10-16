export const paymentMethodTypes = Object.freeze({
  COLLECTIVE: 'collective', // service: opencollective
  PREPAID: 'prepaid', // service: opencollective
  VIRTUALCARD: 'virtualcard', // service: opencollective
  ADAPTIVE: 'adaptive', // service: paypal
  PAYMENT: 'payment', // service: paypal
  CREDITCARD: 'creditcard', // service: stripe
  BITCOIN: 'bitcoin', // service: stripe
});

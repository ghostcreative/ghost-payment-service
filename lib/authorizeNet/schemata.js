const Joi = require('joi');

const Schemata = {};

/**
 * @typedef BillingAddress
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} address
 * @param {String} city
 * @param {'us'} country
 * @param {String} state
 * @param {String} zip
 */
Schemata.billingAddress = {
  firstName: Joi.string().required().error(new Error('Missing billing address first name.')),
  lastName: Joi.string().required().error(new Error('Missing billing address last name.')),
  address: Joi.string().required().error(new Error('Missing billing address.')),
  city: Joi.string().required().error(new Error('Missing billing address city.')),
  country: Joi.string().allow('us').required().error(new Error('Only US cards are supported at this time.')),
  state: Joi.string().required().error(new Error('Missing billing address state.')),
  zip: Joi.string().required().error(new Error('Missing billing address zip.'))
};

/**
 * @typedef CreditCard
 * @param {String} number
 * @param {String} exp_year
 * @param {String} exp_month
 * @param {String} cvc
 */
Schemata.creditCard = {
  number: Joi.string().creditCard().required().error(new Error('Invalid credit card number.')),
  exp_year: Joi.string().regex(/^[12][0-9]{3}$/).error(new Error('Invalid expiration year.')),
  exp_month: Joi.string().regex(/^(0?[1-9]|1[012])$/).required().error(new Error('Invalid expiration month.')),
  cvc: Joi.string().min(3).max(4).required().error(new Error('Invalid CVC.'))
};

module.exports = Schemata;
const Joi = require('joi');

const Schemata = {};

/**
 * @typedef BillingAddress
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} address
 * @param {String} city
 * @param {String} state
 * @param {String} zip
 */
Schemata.billingAddress = {
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  address: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  zip: Joi.string().required()
};

/**
 * @typedef CreditCard
 * @param {String} number
 * @param {String} exp_year
 * @param {String} exp_month
 * @param {String} cvc
 */
Schemata.creditCard = {
  number: Joi.string().creditCard().required(),
  exp_year: Joi.string(),
  exp_month: Joi.string().allow(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9']).required(),
  cvc: Joi.string().min(3).max(4).required()
};

module.exports = Schemata;
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Joi = require('joi');
const moment = require('moment');

const AbstractGhostPaymentService = require('../AbstractGhostPaymentService');
const Types = require('auth-net-types');
const AuthorizeCIM = require('auth-net-cim');
const AuthorizeNet = require('authorize-net');
const Schemata = require('./schemata');

class AuthorizeNetService extends AbstractGhostPaymentService {

  /**
   * @param {GhostPaymentService_AuthorizeNetConfig} options
   */
  constructor (options) {
    super();

    this._authorizeCIM = new AuthorizeCIM({
      api: options.apiLoginId,
      key: options.transactionKey,
      sandbox: options.sandboxMode
    });

    this._authorizeClient = new AuthorizeNet({ // https://github.com/continuous-software/node-authorize-net
      API_LOGIN_ID: options.apiLoginId,
      TRANSACTION_KEY: options.transactionKey,
      testMode: options.sandboxMode
    });
  }

  /**
   * @param {Object} data
   * @param {String} data.customerPaymentProfileId
   * @param {String} data.customerProfileId
   * @return Promise
   */
  deleteCard (data = {}) {
    return new Promise((resolve, reject) => {
      this._authorizeCIM.deleteCustomerPaymentProfile(data, (err, response) => {
        if (err) reject(err);
        else resolve(response)
      })
    })
  }

  /**
   * @param {Object} data
   * @param {BillingAddress} data.billingAddress
   * @param {CreditCard} data.card
   * @param {String} data.customerId
   * @return Promise
   */
  createCard (data = {}) {

    return Promise.resolve()
    .then(() => {
      // Validate customerId
      if (!data.customerId) throw 'Missing customer Id.';

      // Validate billing address
      const billingAddressValidation = Joi.validate(data.billingAddress, Schemata.billingAddress);
      if (billingAddressValidation.error) throw _.get(billingAddressValidation, 'error.message', 'Invalid billing address.');

      // Validate credit card
      const creditCardValidation = Joi.validate(data.card, Schemata.creditCard);
      console.log('validating', data.card);
      console.log('validation', creditCardValidation);
      if (creditCardValidation.error) throw _.get(creditCardValidation, 'error.message', 'Invalid credit card.');

      const billingAddress = new Types.BillingAddress(_.assignIn(data.billingAddress, { country: 'us' }));
      const creditCard = new Types.CreditCard({
        cardNumber: data.card.number,
        expirationDate: data.card.exp_year + '-' + data.card.exp_month,
        cardCode: data.card.cvc
      });

      return { billingAddress, creditCard };

    })
    .then(( { billingAddress, creditCard }) => {

      return new Promise((resolve, reject) => {

        const paymentProfile = {
          customerType: 'business',
          billTo: billingAddress,
          payment: { creditCard }
        };

        this._authorizeCIM.createCustomerPaymentProfile({ customerProfileId: data.customerId, paymentProfile }, (err, response) => {
          if (err) reject(err);
          else {
            paymentProfile.customerPaymentProfileId = response.customerPaymentProfileId;
            resolve(paymentProfile);
          }
        });
      })
      .then(card => this.getCard({ customerId: data.customerId, cardId: card.customerPaymentProfileId }))
    })
  }

  /**
   * @param {Object} data
   * @param {Number} data.amount
   * @param {String} data.customerId
   * @param {String} data.cardId
   * @return Promise
   */
  createCharge (data = {}) {
    return new Promise((resolve, reject) => {
      this._authorizeClient.chargeCustomer(
          { amount: (data.amount / 100).toFixed(2) },
          { profileId: data.customerId },
          { customerPaymentProfileId: data.cardId }
      )
      .then(result => {
        if (!result._original || result._original.errors) reject(this._buildChargeError(result._original.errors));
        resolve(_.mapValues(result._original, (val) => _.head(val))); // auth net returns an object where each value is an array, map to normal object
      })
      .catch(err => reject(err));
    })
  }

  /**
   * @param {object} data
   * @param {object} data.id
   * @param {string} data.email
   */
  createCustomer (data = {}) {
    return Promise.resolve()
    .then(() => {
      return new Promise((resolve, reject) => {
        const Customer = new Types.CustomerBasic({
          merchantCustomerId: data.id,
          description: 'Id: ' + data.id,
          email: data.email
        });

        this._authorizeCIM.createCustomerProfile({ customerProfile: Customer }, (err, response) => {
          if (err) reject(err);
          else {
            Customer.paymentProfileIds = response.customerPaymentProfileIdList.numericString;
            Customer.customerProfileId = response.customerProfileId;
            resolve(Customer);
          }
        });
      })
    })
    .then(customer => this.getCustomer({ customerId: customer.customerProfileId }))
  }

  /**
   * @param {object} data
   * @param {string} data.customerId
   * @param {string} data.cardId
   * @return Promise
   */
  getCard (data = {}) {
    return new Promise((resolve, reject) => {
      this._authorizeCIM.getCustomerPaymentProfile({ customerProfileId: data.customerId, customerPaymentProfileId: data.cardId }, (err, response) => {
        if (err) reject(err);
        else resolve(response.paymentProfile)
      });
    })
  }

  /**
   * @param {String} data.customerId
   * @return Promise
   */
  getCards (customerId) {
    return this.getCustomer(customerId)
    .then(customer => {
      let paymentProfiles = _.get(customer, 'paymentProfiles', []);
      if (!_.isArray(paymentProfiles)) { paymentProfiles = [paymentProfiles]; }

      return _.map(paymentProfiles, paymentProfile => {
        return {
          customerPaymentProfileId: _.get(paymentProfile, 'customerPaymentProfileId', null),
          cardNumber: `****${_.get(paymentProfile, 'payment.creditCard.cardNumber', '').slice(-4)}`,
          cardType: _.get(paymentProfile, 'payment.creditCard.cardType', '')
        };
      });
    });
  }

  /**
   * @param {String} customerId
   * @return Promise
   */
  getCustomer (customerId) {
    return new Promise((resolve, reject) => {
      if (customerId) reject('Missing customer Id.');
      this._authorizeCIM.getCustomerProfile(customerId, (err, response) => {
        if (err) reject(err);
        else response.profile ? resolve(response.profile) : reject('Unable to find customer.')
      });
    })
  }

  /**
   * @param {Object} data
   * @param {Number} data.amount
   * @param {String} data.paymentId
   * @param {String} data.createdAt
   * @return Promise
   */
  refundTransaction (data = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        amount: data.amount,
        expirationMonth: 'XX',
        expirationYear: 'XXXX'
      };
      this._authorizeClient.refundTransaction( data.paymentId, options )
      .then(result => resolve(result))
      .catch(err => {
        if (moment(data.createdAt).add('2', 'days').isAfter(moment()) && err.message == 'The referenced transaction does not meet the criteria for issuing a credit.') {
          return resolve(this._authorizeClient.voidTransaction(data.paymentId));
        } else {
          reject(err);
        }
      });
    })
  }

  /**
   * @param {[object]} errors
   * @return {String}
   */
  static _buildChargeError (errors) {
    if (!Array.isArray(errors) || !errors.length || !errors[0].error[0].errorText) return 'Unable to complete transaction.';
    return errors[0].error[0].errorText;
  }

}

module.exports = AuthorizeNetService;
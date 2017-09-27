'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const AbstractGhostPaymentService = require('../AbstractGhostPaymentService');
const Types = require('auth-net-types');
const AuthorizeCIM = require('auth-net-cim');
const AuthorizeNet = require('authorize-net');

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
   * @param {object} data
   * @param {string} data.cardId
   * @param {string} data.customerId
   * @return Promise
   */
  deleteCard (data = {}) {
    return new Promise((resolve, reject) => {
      this._authorizeCIM.deleteCustomerPaymentProfile({
        customerProfileId: data.customerId,
        customerPaymentProfileId: data.cardId
      }, (err, response) => {
        if (err) reject(err);
        else resolve(response)
      })
    })
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @param {object} data.billingAddress
   * @param {string} data.billingAddress.firstName
   * @param {string} data.billingAddress.lastName
   * @param {string} data.billingAddress.address
   * @param {string} data.billingAddress.city
   * @param {string} data.billingAddress.state
   * @param {string} data.billingAddress.zip
   * @param {object} data.card
   * @param {string} data.card.number
   * @param {string} data.card.exp_month
   * @param {string} data.card.exp_year
   * @param {string} data.card.cvc
   * @return Promise
   */
  createCard (data = {}) {
    let billingAddress, card;
  
    return Promise.resolve()
    .then(() => {
      if (!data.customerId) throw new Error('Missing customer Id.');
      return this._validateBillingAddress(data.billingAddress)
      .tap(address => billingAddress = address)
      .then(() => this._validateCard(data.card))
      .tap(_card_ => card = _card_)
      .then(() => {
        return new Promise((resolve, reject) => {
        
          const paymentProfile = {
            customerType: 'business',
            billTo: billingAddress,
            payment: { creditCard: card }
          };
        
          this._authorizeCIM.createCustomerPaymentProfile({
            customerProfileId: data.customerId,
            paymentProfile: paymentProfile
          }, (err, response) => {
            if (err) reject(err);
            else {
              paymentProfile.customerPaymentProfileId = response.customerPaymentProfileId;
              if (paymentProfile.billTo && paymentProfile.billTo.bin) {
                paymentProfile.billTo = paymentProfile.billTo.bin[0];
              }
              resolve(paymentProfile)
            }
          });
        })
      })
      .then(card => this.getCard({ customerId: data.customerId, cardId: card.customerPaymentProfileId }))
    });
  }
  
  /**
   * @param {object} data
   * @param {int} data.amount
   * @param {string} data.currency
   * @param {string} data.customer
   * @param {string} data.description
   * @param {string} data.source
   * @param {string} data.cardId
   * @return Promise
   */
  createCharge (data = {}) {
    return new Promise((resolve, reject) => {
      this._authorizeClient.chargeCustomer(
        { amount: (data.amount / 100).toFixed(2) },
        { profileId: data.customerId },
        { customerPaymentProfileId: data.source || data.cardId }
      )
      .then(result => {
        if (!result._original || result._original.errors) reject(this._buildChargeError(result._original.errors));
        resolve(_.mapValues(result._original, (val) => _.head(val))); // auth net returns an object where each value is an array, map to normal object
      });
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
      this._authorizeCIM.getCustomerPaymentProfile({
        customerProfileId: data.customerId,
        customerPaymentProfileId: data.cardId
      }, (err, response) => {
        if (err) reject(err);
        else resolve(response.paymentProfile)
      });
    })
  }
  
  /**
   * @param {object} data
   * @param {String} data.customerId
   * @return Promise
   */
  getCards (data = {}) {
    return this.getCustomer(data)
    .then(customer => Array.isArray(customer.paymentProfiles) ? customer.paymentProfiles : [customer.paymentProfiles])
  }
  
  /**
   * @param {object} data
   * @param {String} data.customerId
   * @return Promise
   */
  getCustomer (data = {}) {
    return new Promise((resolve, reject) => {
      if (!data.customerId) reject('Missing customer Id.');
      this._authorizeCIM.getCustomerProfile(data.customerId, (err, response) => {
        if (err) reject(err);
        else response.profile ? resolve(response.profile) : reject('Unable to find customer.')
      });
    })
  }

  /**
   * @param {[object]} errors
   * @return {String}
   */
  static _buildChargeError(errors) {
    if (!Array.isArray(errors) || !errors.length || !errors[0].error[0].errorText) return 'Unable to complete transaction.';
    return errors[0].error[0].errorText;
  }
  
  _validateBillingAddress (data = {}) {
    
    return Promise.resolve()
    .then(() => {
      if (!data.firstName) throw new Error('Missing billing address first name.');
      if (!data.lastName) throw new Error('Missing billing address last name.');
      if (!data.address) throw new Error('Missing billing address.');
      if (!data.city) throw new Error('Missing billing address city.');
      if (!data.state) throw new Error('Missing billing address state.');
      if (!data.zip) throw new Error('Missing billing address zip.');
      
      return new Types.BillingAddress({
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: 'us'
      });
    });
  }
  
  _validateCard (data = {}) {
    return Promise.resolve()
    .then(() => {
      if (!data.number) throw new Error('Missing card number.');
      if (!data.exp_year) throw new Error('Missing card expiration year.');
      if (!data.exp_month) throw new Error('Missing card expiration month.');
      if (!data.cvc) throw new Error('Missing card CVC.');
      
      return new Types.CreditCard({
        cardNumber: data.number,
        expirationDate: data.exp_year + '-' + data.exp_month,
        cardCode: data.cvc
      });
    });
  }
  
}

module.exports = AuthorizeNetService;
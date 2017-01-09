'use strict';

const Promise = require('bluebird');

const AbstractGhostPaymentService = require('../AbstractGhostPaymentService');

class StripeService extends AbstractGhostPaymentService {
  
  /**
   * @param {GhostPaymentService_StripeConfig} options
   */
  constructor (options = {}) {
    super();
    this._stripe = require('stripe')(options.secretKey);
    this._errorCodes = ['invalid_number', 'invalid_expiry_month', 'invalid_expiry_year', 'invalid_cvc', 'incorrect_number', 'expired_card', 'incorrect_cvc', 'incorrect_zip', 'card_declined', 'missing', 'processing_error'];
  }
  
  /**
   * @param {string} code
   * @return Boolean
   */
  isValidErrorCode (code) {
    return this._errorCodes.indexOf(code) >= 0;
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @param {object} data.card
   * @param {string} data.card.number
   * @param {string} data.card.exp_month
   * @param {string} data.card.exp_year
   * @param {string} data.card.cvc
   * @return Promise
   */
  createCard (data) {
    return Promise.resolve()
    .then(() => new Promise((resolve, reject) => {
      this._stripe.tokens.create({ card: data.card }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      });
    }))
    .then(token => new Promise((resolve, reject) => {
      this._stripe.customers.createSource(data.customerId, { source: token.id }, (err, card) => {
        if (err) reject(err);
        else resolve(card);
      });
    }))
  }
  
  /**
   * @param {object} data
   * @param {int} data.amount
   * @param {string} data.currency
   * @param {string} data.customer
   * @param {string} data.description
   * @param {string} data.source
   * @return Promise
   */
  createCharge (data) {
    return new Promise((resolve, reject) => {
      this._stripe.charges.create(data, (err, charge) => {
        if (err) reject(err);
        else resolve(charge)
      })
    })
  }

  /**
   * @param {object} data
   */
  createCustomer (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.create(data, (err, customer) => {
        if (err) reject(err);
        else resolve(customer)
      })
    })
  }

  /**
   * @param {object} data
   * @param {string} data.id
   * @param {int} data.amount
   * @param {string} data.interval
   * @param {string} data.name
   * @param {string} data.currency
   * @param {object} data.metadata
   * @param {string} data.metadata.description
   * @param {int} data.trial_period_days
   * @return Promise
   */
  createPlan(data) {
    return new Promise((resolve, reject) => {
      this._stripe.plans.create(data, (err, plan) => {
        if (err) reject(err);
        else resolve(plan)
      })
    })
  }

  /**
   * @param {object} data
   * @param {string} data.customerId
   * @param {string} data.planId
   */
  createSubscription (data) {
    return new Promise((resolve, reject) => {
      return this._stripe.customers.update(data.customerId, { plan: data.planId }, (err, success) => {
        if (err) reject(err);
        else resolve(success)
      })
    })
  }

  /**
   * @param {object} data
   * @param {string} data.cardId
   * @param {string} data.customerId
   * @return Promise
   */
  deleteCard (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.deleteCard(data.customerId, data.cardId, (err, confirmation) => {
        if (err) reject(err);
        else resolve(confirmation);
      })
    })
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @return Promise
   */
  deleteCustomer (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.del(data.customerId, (err, confirmation) => {
        if (err) reject(err);
        else resolve(confirmation);
      })
    })
  }

  /**
   * @param {object} data
   * @param {int} data.limit
   */
  fetchPlans (data) {
    return new Promise((resolve, reject) => {
      this._stripe.plans.list(data, (err, plans) => {
        if (err) reject(err);
        else resolve(plans.data)
      })
    })
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @param {string} data.cardId
   * @return Promise
   */
  getCard (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.retrieveCard(data.customerId, data.cardId, (err, card) => {
        if (err) reject(err);
        else resolve(card);
      })
    })
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @return Promise
   */
  getCards (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.listCards(data.customerId, (err, cards) => {
        if (err) reject(err);
        else resolve(cards);
      })
    })
  }
  
  /**
   * @param {object} data
   * @param {string} data.customerId
   * @return Promise
   */
  getCustomer (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.retrieve(data.customerId, (err, customer) => {
        if (err) reject(err);
        else resolve(customer);
      })
    })
  }

  /**
   * @param {object} data
   * @param {string} data.planId
   * @return Promise
   */
  getPlan (data) {
    return new Promise((resolve, reject) => {
      this._stripe.plans.retrieve(data.planId, (err, plan) => {
          if (err) reject(err);
          else resolve(plan);
        }
      );
    })
  }

  /**
   * @param {object} data
   * @param {string} data.cardId
   * @param {string} data.customerId
   * @return Promise
   */
  setDefaultCard (data) {
    return new Promise((resolve, reject) => {
      this._stripe.customers.update(data.customerId, {default_source: data.cardId}, (err, customer) => {
        if (err) reject(err);
        else resolve(customer);
      })
    })
  }

  /**
   * @param {StripeCustomer} data
   * @return Promise
   */
  updateCustomer (data) {
    return new Promise((resolve, reject) => {
      const customerId = data.customerId;
      delete data.customerId;
      this._stripe.customers.update(customerId, data, (err, customer) => {
        if (err) reject(err);
        else resolve(customer);
      })
    })
  }

  /**
   * @param {object} data
   * @param {id} data.planId
   * @param {string} data.name
   * @param {object} data.metadata
   * @param {string} data.metadata.description
   * @return Promise
   */
  updatePlan (data) {
    return new Promise((resolve, reject) => {
      let planData = { name : data.name };
      if (data.metadata && data.metadata.description) planData.metadata = data.metadata;
      this._stripe.plans.update(data.planId, planData, (err, plan) => {
        if (err) reject(err);
        else resolve(plan);
      })
    })
  }
}

module.exports = StripeService;
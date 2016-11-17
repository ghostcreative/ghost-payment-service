'use strict';

const Promise = require('bluebird');

class AbstractGhostPaymentService {
  
  constructor () {}
  
  /**
   * @param {string} code
   * @return Boolean
   */
  isValidErrorCode (code) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @param {string} data.cardId
   * @param {string} data.customerId
   * @return Promise
   */
  deleteCard (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  deleteCustomer (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  getCard (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  getCards (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  createCard (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  createCharge (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   */
  createCustomer (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  getCustomer (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
  
  /**
   * @param {object} data
   * @return Promise
   */
  updateCustomer (data) {
    return Promise.reject(new Error('Abstract method - must override'));
  }
}

module.exports = AbstractGhostPaymentService;
'use strict';

const AuthorizeNetService = require('./authorizeNetService');

class StripeServiceFactory {
  
  /**
   * @param {GhostPaymentService_AuthorizeNetConfig} options
   * @return {StripeService}
   */
  static create (options = {}) {
    return new AuthorizeNetService(options);
  }
  
}

module.exports = StripeServiceFactory;
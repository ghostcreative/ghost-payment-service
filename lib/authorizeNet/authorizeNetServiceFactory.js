'use strict';

const AuthorizeNetService = require('./authorizeNetService');

class StripeServiceFactory {
  
  /**
   * @param {GhostPaymentService_AuthorizeNetConfig} options
   * @return {AuthorizeNetService}
   */
  static create (options = {}) {
    return new AuthorizeNetService(options);
  }
  
}

module.exports = StripeServiceFactory;
'use strict';

const StripeService = require('./stripeService');

class StripeServiceFactory {
  
  /**
   * @param {GhostPaymentService_StripeConfig} options
   * @return {StripeService}
   */
  static create (options = {}) {
    return new StripeService(options);
  }
  
}

module.exports = StripeServiceFactory;
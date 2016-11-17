'use strict';
const AuthorizeNetServiceFactory = require('./authorizeNet/authorizeNetServiceFactory');
const StripeServiceFactory = require('./stripe/stripeServiceFactory');

class GhostPaymentServiceFactory {
  
  /**
   * @name GhostPaymentService_AuthorizeNetConfig
   * @type {Object}
   * @property {String} apiLoginId
   * @property {String} transactionKey
   * @property {String} sandboxMode
   */
  
  /**
   * @name GhostPaymentService_StripeConfig
   * @type {Object}
   * @property {String} publishKey
   * @property {String} secretKey
   */
  
  /**
   * @name GhostPaymentService_Config
   * @type {Object}
   * @property {'stripe'|'authorizeNet'} processor - The payment processor
   * @property {GhostPaymentService_AuthorizeNetConfig} authorizeNet - Authorize.net configuration
   * @property {GhostPaymentService_StripeConfig} stripe - stripe configuration
   */
  
  /**
   * @param {GhostPaymentService_Config} options
   * @return {StripeService|AuthorizeNetService}
   */
   constructor (options) {
    if (options.processor == 'authorizeNet') return AuthorizeNetServiceFactory.create(options.authorizeNet);
    else if (options.processor == 'stripe') return StripeServiceFactory.create(options.stripe);
    else throw new Error('GhostPaymentService: Unknown payment processor.')
  }
  
}

module.exports = GhostPaymentServiceFactory;
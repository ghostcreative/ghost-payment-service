const Promise = require('bluebird');
const Config = require('config');
const Chance = require('chance');
const Stripe = require('stripe')(Config.get("stripe.secretKey"));

class stripeSetup {
  
  static generateCard () {
    return {
      "number": '4242424242424242',
      "exp_month": 12,
      "exp_year": 2018,
      "cvc": '123'
    }
  }
  
  static setupCard (data) {
    data = data || {};
    return this.setupToken()
    .then(_token_ => {
      return new Promise((resolve, reject) => {
        Stripe.customers.createSource(data.customerId, { source: _token_.id }, (err, card) => {
          if (err) reject(err);
          else resolve(card);
        })
      })
    })
  }
  
  static setupCustomer (data) {
    data = data || {};
    return new Promise((resolve, reject) => {
      Stripe.customers.create({
        description: data.description || 'Test Customer',
        email: data.email || 'test@ghostcreative.io'
      }, (err, customer) => {
        if (err) reject(err);
        else resolve(customer);
      })
    })
  }
  
  static setupToken () {
    return new Promise((resolve, reject) => {
      Stripe.tokens.create({ card: this.generateCard() }, (err, token) => {
        if (err) reject(err);
        else resolve(token);
      })
    })
  }
  
}

module.exports = stripeSetup;
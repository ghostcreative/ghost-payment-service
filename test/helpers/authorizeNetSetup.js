const Promise = require('bluebird');
const Config = require('config');
const Chance = require('chance').Chance();
const Types = require('auth-net-types');
const AuthorizeCIM = require('auth-net-cim');
const AuthorizeNet = require('authorize-net');

const _authorizeCIM = new AuthorizeCIM({
  api: Config.get('authorizeNet.apiLoginId'),
  key: Config.get('authorizeNet.transactionKey'),
  sandbox: Config.get('authorizeNet.sandboxMode')
});
  
const _authorizeClient = new AuthorizeNet({ // https://github.com/continuous-software/node-authorize-net
  API_LOGIN_ID: Config.get('authorizeNet.apiLoginId'),
  TRANSACTION_KEY: Config.get('authorizeNet.transactionKey'),
  testMode: Config.get('authorizeNet.sandboxMode')
});


class authorizeNetSetup {
  
  static generateAddress () {
    return {
      firstName: Chance.first(),
      lastName: Chance.last(),
      address: Chance.address(),
      city: Chance.city(),
      state: Chance.state(),
      zip: Chance.zip(),
      country: 'us'
    }
  }
  
  static generateCard () {
    return {
      "number": '4242424242424242',
      "exp_month": 12,
      "exp_year": 2018,
      "cvc": '123'
    }
  }
  
  static setupCard (data = {}) {
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
          
          _authorizeCIM.createCustomerPaymentProfile({
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
    });
  }
  
  static setupCustomer (data = {}) {
    return new Promise((resolve, reject) => {
      const Customer = new Types.CustomerBasic({
        merchantCustomerId: data.id,
        description: 'Id: ' + data.id,
        email: data.email || Chance.email()
      });
  
      _authorizeCIM.createCustomerProfile({ customerProfile: Customer }, (err, response) => {
        if (err) reject(err);
        else {
          Customer.paymentProfileIds = response.customerPaymentProfileIdList.numericString;
          Customer.customerProfileId = response.customerProfileId;
          resolve(Customer);
        }
      });
    });
    
  }
  
  static getCustomer (data = {}) {
    return new Promise((resolve, reject) => {
      if (!data.customerId) reject('Missing customer Id.');
      _authorizeCIM.getCustomerProfile(data.customerId, (err, response) => {
        if (err) reject(err);
        else response.profile ? resolve(response.profile) : reject('Unable to find customer.')
      });
    })
  }
  
  static _validateBillingAddress (data = {}) {
    
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
  
  static _validateCard (data = {}) {
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

module.exports = authorizeNetSetup;
const Chai = require('chai');
const expect = Chai.expect;
const Chance = require('chance').Chance();
const Config = require('config');
const _ = require('lodash');
const stripeSetup = require('./helpers/stripeSetup');
const authorizeNetSetup = require('./helpers/authorizeNetSetup');

const GhostPaymentService = require('../index');

const cardData = stripeSetup.generateCard();
let card;
let customer;
let token;
let service;

describe('GhostPaymentService', function () {
  this.timeout(5000);

  describe('StripeService', () => {
  
    before(() => {
      return stripeSetup.setupCustomer()
      .tap(_customer_ => customer = _customer_)
      .then(_customer_ => stripeSetup.setupCard({ customerId: _customer_.id }))
      .then(() => stripeSetup.setupCard({ customerId: customer.id }))
      .then(() => stripeSetup.setupCard({ customerId: customer.id }))
      .tap(_card_ => card = _card_)
      .then(_card_ => stripeSetup.setupToken())
      .tap(_token_ => token = _token_)
      .then(() => service = new GhostPaymentService({
        processor: 'stripe',
        stripe: Config.get('stripe')
      }))
    });
    
    describe('cards', () => {
      
      it('should create a card', () => {
        return service.createCard({ card: cardData, customerId: customer.id })
        .then(_card_ => {
          expect(_card_).to.exist;
          expect(_card_.exp_month).to.be.equal(cardData.exp_month);
          expect(_card_.exp_year).to.be.equal(cardData.exp_year);
          expect(_card_.customer).to.be.equal(customer.id);
        })
      });
      
      it('should get a customers card', () => {
        return service.getCard({ customerId: customer.id, cardId: card.id })
        .then(_card_ => {
          expect(_card_).to.exist;
          expect(_card_.id).to.exist;
          expect(_card_.id).to.be.eql(card.id);
        })
      });
      
      it('should list a customers cards', () => {
        return service.getCards({ customerId: customer.id })
        .then(cards => {
          expect(cards).to.exist;
          expect(cards.data).to.exist;
          expect(cards.data).to.be.an('array');
        })
      });
      
      it('should delete a card', () => {
        return service.deleteCard({ cardId: card.id, customerId: customer.id })
        .then(confirmation => {
          expect(confirmation).to.exist;
        })
      });

      it('should update a customer\'s default card', () => {
        return service.setDefaultCard({ cardId: card.id, customerId: customer.id })
        .then(customer => {
          expect(customer).to.exist;
          expect(customer.default_source).to.be.equal(card.id);
        })
      })
    });
    
    describe('charges', () => {
      
      it('should create a charge', () => {
        return service.createCharge({
          amount: 10000,
          currency: 'usd',
          source: token.id,
          description: 'Test Charge'
        })
        .then(charge => {
          expect(charge).to.exist;
          expect(charge.amount).to.equal(10000);
          expect(charge.description).to.equal('Test Charge');
        });
        
      });
    });
    
    describe('customers', () => {
      
      it('should create a customer', () => {
        return service.createCustomer({ description: `Test Profile` })
        .then(_customer_ => {
          expect(_customer_).to.exist;
          expect(_customer_.description).to.be.equal(`Test Profile`);
        });
      });
      
      it('should get a customer', () => {
        return service.getCustomer({ customerId: customer.id })
        .then(_customer_ => {
          expect(_customer_).to.exist;
          expect(_customer_.id).to.be.equal(customer.id);
        })
      });
      
      it('should update a customer', () => {
        const customerCopy = {
          customerId: customer.id,
          email: customer.email,
          description: 'changing the description'
        };
        return service.updateCustomer(customerCopy)
        .then(_customer_ => {
          expect(_customer_).to.exist;
          expect(_customer_.description).to.equal(customerCopy.description);
        })
      });
      
      it('should delete a customer', () => {
        return service.deleteCustomer({ customerId: customer.id })
        .then(confirmation => {
          expect(confirmation).to.exist;
        })
      });
    });

    describe('plans', () => {

      it('should create a plan', () => {
        const id = Chance.natural({min: 10000000, max: 99999999});
        const plan = {
          amount: 10000,
          id: id,
          interval: "month",
          name: "New Test Plan",
          currency: "usd",
          metadata: {
            description: "This plan is a test."
          },
          trial_period_days: 1
        };
        return service.createPlan(plan)
        .then(_plan_ => {
          console.log('plan', _plan_);
          expect(_plan_).to.exist;
          expect(_plan_).id.to.be.equal(id);
        })
      })

    })
    
  });
  
  describe('AuthorizeNetService', () => {
  
    before(() => {
      return authorizeNetSetup.setupCustomer()
      .tap(_customer_ => customer = _customer_)
      .then(customer => authorizeNetSetup.setupCard({
        customerId: customer.customerProfileId,
        card: authorizeNetSetup.generateCard(),
        billingAddress: authorizeNetSetup.generateAddress()
      }))
      .tap(_card_ => card = _card_)
      .then(() => authorizeNetSetup.getCustomer({ customerId: customer.customerProfileId }))
      .then(_customer_ => customer = _customer_)
      .then(() => service = new GhostPaymentService({
        processor: 'authorizeNet',
        authorizeNet: Config.get('authorizeNet')
      }))
    });
    
    describe('cards', () => {
  
      it('should get a customers card', () => {
        return service.getCard({
          cardId: customer.paymentProfiles.customerPaymentProfileId,
          customerId: customer.customerProfileId
        })
        .then(_card_ => {
          expect(_card_).to.exist;
          expect(_card_.customerType).to.be.equal('business');
          expect(_card_.billTo).to.exist;
          expect(_card_.customerProfileId).to.be.equal(customer.customerProfileId);
          expect(_card_.customerPaymentProfileId).to.be.equal(customer.paymentProfiles.customerPaymentProfileId);
        })
      });
  
      it('should list a customers cards', () => {
        return service.getCards({ customerId: customer.customerProfileId })
        .then(cards => {
          expect(cards).to.exist;
          expect(cards).to.be.an('array');
          expect(cards.length).to.be.equal(1);
          cards.forEach(card => {
            expect(card).to.exist;
            expect(card.customerType).to.be.equal('business');
            expect(card.billTo).to.exist;
            expect(card.customerPaymentProfileId).to.exist;
          })
        })
      });
  
      it('should create a card', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: authorizeNetSetup.generateAddress()
        })
        .then(_card_ => {
          expect(_card_).to.exist;
          expect(_card_.customerType).to.be.equal('business');
          expect(_card_.billTo).to.exist;
          expect(_card_.customerProfileId).to.be.equal(customer.customerProfileId);
          expect(_card_.customerPaymentProfileId).to.be.exist;
        })
      });
  
      it('should delete a card', () => {
        // TODO
      });
      
    });
  
    describe('charges', () => {
    
      it('should create a charge', () => {

        return service.createCharge({
          amount: Chance.integer({ min: 100, max: 1000000 }),
          customerId: customer.customerProfileId,
          cardId: customer.paymentProfiles.customerPaymentProfileId
        })
        .then(charge => {
          expect(charge).to.exist;
          expect(charge.transId).to.exist;
        })

      });

      it('should return an error when an incorrect customerId is provided', () => {

        return service.createCharge({
          amount: Chance.integer({ min: 100, max: 1000000 }),
          customerId: 'fakecustomerid',
          cardId: customer.paymentProfiles.customerPaymentProfileId
        })
        .then(charge => expect(charge).to.not.exist)
        .catch(err => expect(err).to.exist)

      });

      it('should return an error when an incorrect amount is provided', () => {

        return service.createCharge({
          amount: -10000,
          customerId: customer.customerProfileId,
          cardId: customer.paymentProfiles.customerPaymentProfileId
        })
        .then(charge => expect(charge).to.not.exist)
        .catch(err => expect(err).to.exist)

      });

      it('should return an error when an incorrect cardId is provided', () => {

        return service.createCharge({
          amount: 10000,
          customerId: customer.customerProfileId,
          cardId: 'nocard'
        })
        .then(charge => expect(charge).to.not.exist)
        .catch(err => expect(err).to.exist)

      });
      
    });
  
    describe('customers', () => {
  
      it('should get a customer', () => {
        return service.getCustomer({ customerId: customer.customerProfileId })
        .then(_customer_ => {
          expect(_customer_).to.exist;
          expect(_customer_.email).to.be.eql(customer.email);
        })
      });
  
      it('should create a customer', () => {
        const newCustomer = {
          id: Chance.integer({ min: 1000, max: 1000000 }),
          email: Chance.email()
        };
        return service.createCustomer(newCustomer)
        .then(_customer_ => {
          expect(_customer_).to.exist;
          expect(_customer_.email).to.be.eql(newCustomer.email);
        })
      });
  
      it('should update a customer', () => {
    
      });
  
      it('should delete a customer', () => {
    
      });
      
    });
    
  });
  
});
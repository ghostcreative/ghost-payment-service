const Chai = require('chai');
const expect = Chai.expect;
const Chance = require('chance').Chance();
const Config = require('config');
const _ = require('lodash');
const authorizeNetSetup = require('./helpers/authorizeNetSetup');

const GhostPaymentService = require('../index');

const cardData = stripeSetup.generateCard();
let card;
let customer;
let transaction;
let token;
let service;

describe('GhostPaymentService', function () {
  this.timeout(10000);

  describe('AuthorizeNetService', () => {

    before(() => {
      return Promise.resolve()
      .then(() => authorizeNetSetup.setupCustomer())
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
      .then(() => service.createCharge({
        amount: 100,
        customerId: customer.customerProfileId,
        cardId: customer.paymentProfiles.customerPaymentProfileId
      }))
      .then(_transaction_ => transaction = _transaction_)
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
          });
        });
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

    });

    describe('refundTransaction', () => {

      it('should void transaction', () => {
        return service.refundTransaction({
          paymentId: transaction.transId,
          amount: 100,
          createdAt: transaction.createdAt
        })
        .then(_refund_ => {
          expect(_refund_).to.exist;
          expect(_refund_._original.messages[0].message[0].description[0]).to.be.equal('This transaction has been approved.');
        });
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

});

});

});
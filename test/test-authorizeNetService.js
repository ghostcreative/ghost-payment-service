const Chai = require('chai');
const expect = Chai.expect;
const Chance = require('chance').Chance();
const Config = require('config');
const _ = require('lodash');
const authorizeNetSetup = require('./helpers/authorizeNetSetup');
const Promise = require('bluebird');

const GhostPaymentService = require('../index');
const cardData = authorizeNetSetup.generateCard();
let card;
let customer;
let transaction;
let service;

describe('GhostPaymentService', function () {
  this.timeout(10000);

  describe('AuthorizeNetService', () => {

    before(() => {
      return Promise.resolve()
      .then(() => authorizeNetSetup.setupCustomer())
      .tap(_customer_ => { customer = _customer_; })
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
          customerPaymentProfileId: customer.paymentProfiles.customerPaymentProfileId,
          customerProfileId: customer.customerProfileId
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
        return service.getCards(customer.customerProfileId)
        .then(cards => {
          expect(cards).to.exist;
          expect(cards).to.be.an('array');
          expect(cards.length).to.be.equal(1);
          cards.forEach(card => {
            expect(card).to.exist;
            expect(card.billTo).to.exist;
            expect(card.customerPaymentProfileId).to.exist;
          });
        });
      });

    });

    describe('createCard', () => {

      it('should throw an error if customerId is missing', () => {
        return service.createCard({
          card: cardData,
          billingAddress: authorizeNetSetup.generateAddress()
        })
        .catch(err => {
          expect(err).to.equal('Missing customer Id.');
        })
      });

      it('should throw an error if billing address is missing first name', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: _.omit(authorizeNetSetup.generateAddress(), ['firstName'])
        })
        .catch(err => {
          expect(err).to.equal('Missing billing address first name.');
        })
      });

      it('should throw an error if billing address is missing last name', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: _.omit(authorizeNetSetup.generateAddress(), ['lastName'])
        })
        .catch(err => {
          expect(err).to.equal('Missing billing address last name.');
        })
      });

      it('should throw an error if billing address is missing city', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: _.omit(authorizeNetSetup.generateAddress(), ['city'])
        })
        .catch(err => {
          expect(err).to.equal('Missing billing address city.');
        })
      });

      it('should throw an error if billing address is missing state', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: _.omit(authorizeNetSetup.generateAddress(), ['state'])
        })
        .catch(err => {
          expect(err).to.equal('Missing billing address state.');
        })
      });

      it('should throw an error if billing address is missing zip', () => {
        return service.createCard({
          card: cardData,
          customerId: customer.customerProfileId,
          billingAddress: _.omit(authorizeNetSetup.generateAddress(), ['zip'])
        })
        .catch(err => {
          expect(err).to.equal('Missing billing address zip.');
        })
      });

      it('should throw an error if card number is invalid', () => {
        const invalidCard = _.assign(_.clone(cardData), { number: 'abc123' });
        return service.createCard({
          card: invalidCard,
          customerId: customer.customerProfileId,
          billingAddress: authorizeNetSetup.generateAddress()
        })
        .catch(err => {
          expect(err).to.equal('Invalid credit card number.');
        })
      });

      it('should throw an error if card expiration month is invalid', () => {
        const invalidCard = _.assign(_.clone(cardData), { exp_month: '14' });
        return service.createCard({
          card: invalidCard,
          customerId: customer.customerProfileId,
          billingAddress: authorizeNetSetup.generateAddress()
        })
        .catch(err => {
          expect(err).to.equal('Invalid expiration month.');
        })
      });

      it('should throw an error if card expiration year is invalid', () => {
        const invalidCard = _.assign(_.clone(cardData), { exp_year: '234' });
        return service.createCard({
          card: invalidCard,
          customerId: customer.customerProfileId,
          billingAddress: authorizeNetSetup.generateAddress()
        })
        .catch(err => {
          expect(err).to.equal('Invalid expiration year.');
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
        return service.getCustomer(customer.customerProfileId)
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

    describe('deleteCard', () => {

      it('should delete a card', () => {
        return service.deleteCard({
          customerPaymentProfileId: card.customerPaymentProfileId,
          customerProfileId: customer.customerProfileId
        })
        .then(response => {
          expect(response).to.exist;
        })
      });

    });

});

});
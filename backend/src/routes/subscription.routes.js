const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscription.controller');

router.get('/', authenticate, subscriptionController.getSubscription);
router.post('/create-order', authenticate, subscriptionController.createOrder);
router.post('/verify', authenticate, subscriptionController.verifyPayment);
router.post('/cancel', authenticate, subscriptionController.cancelSubscription);

module.exports = router;

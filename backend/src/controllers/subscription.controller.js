const subscriptionService = require('../services/subscription.service');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/subscription — Get current user's subscription
 */
const getSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getSubscription(req.user.id);
    res.json({ success: true, data: { subscription } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscription/create-order — Create Razorpay order
 */
const createOrder = async (req, res, next) => {
  try {
    const { planId, billingCycle } = req.body;

    if (!planId || !billingCycle) {
      throw new AppError('planId and billingCycle are required', 400);
    }
    if (!['pro', 'elite'].includes(planId)) {
      throw new AppError('Invalid plan. Choose pro or elite.', 400);
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      throw new AppError('Invalid billing cycle. Choose monthly or yearly.', 400);
    }

    const order = await subscriptionService.createOrder(req.user.id, planId, billingCycle);
    
    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        planId,
        billingCycle,
        keyId: require('../config').razorpayKeyId,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    const msg = error?.error?.description || error?.message || 'Failed to create order';
    next(new AppError(msg, error?.statusCode || 400));
  }
};

/**
 * POST /api/subscription/verify — Verify payment & activate subscription
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Payment verification data missing', 400);
    }

    const isValid = subscriptionService.verifyPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      throw new AppError('Payment verification failed. Signature mismatch.', 400);
    }

    const subscription = await subscriptionService.activateSubscription(
      req.user.id,
      planId,
      billingCycle,
      razorpay_payment_id,
      razorpay_order_id
    );

    res.json({
      success: true,
      data: { subscription },
      message: 'Payment verified and subscription activated!',
    });
  } catch (error) {
    next(new AppError(error.message || 'Payment verification failed', 400));
  }
};

/**
 * POST /api/subscription/cancel — Cancel subscription
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(new AppError(error.message || 'Failed to cancel subscription', 400));
  }
};

module.exports = { getSubscription, createOrder, verifyPayment, cancelSubscription };

const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/database');
const config = require('../config');

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: config.razorpayKeyId || '',
    key_secret: config.razorpayKeySecret || '',
  });
} catch (err) {
  console.error('Razorpay initialization failed:', err.message);
}

// Plan pricing in paise (₹1 = 100 paise)
const PLAN_PRICES = {
  pro: { monthly: 49900, yearly: 499000 },
  elite: { monthly: 99900, yearly: 999000 },
};

const PLAN_NAMES = {
  pro: 'RIX Pro',
  elite: 'RIX Elite',
};

/**
 * Create a Razorpay order for one-time payment style checkout
 */
async function createOrder(userId, planId, billingCycle) {
  if (!PLAN_PRICES[planId]) throw new Error('Invalid plan');
  
  const amount = PLAN_PRICES[planId][billingCycle];
  if (!amount) throw new Error('Invalid billing cycle');

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `rix_${userId}_${Date.now()}`,
    notes: {
      userId,
      plan: planId,
      billingCycle,
    },
  });

  return order;
}

/**
 * Verify Razorpay payment signature
 */
function verifyPayment(orderId, paymentId, signature) {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

/**
 * Activate subscription after successful payment
 */
async function activateSubscription(userId, planId, billingCycle, paymentId, orderId) {
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: planId,
      status: 'active',
      billingCycle,
      razorpayPaymentId: paymentId,
      razorpaySubscriptionId: orderId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelledAt: null,
    },
    create: {
      userId,
      plan: planId,
      status: 'active',
      billingCycle,
      razorpayPaymentId: paymentId,
      razorpaySubscriptionId: orderId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  return subscription;
}

/**
 * Get current subscription for a user
 */
async function getSubscription(userId) {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  // Check if subscription has expired
  if (sub && sub.status === 'active' && sub.currentPeriodEnd && new Date() > sub.currentPeriodEnd) {
    await prisma.subscription.update({
      where: { userId },
      data: { status: 'expired', plan: 'free' },
    });
    return { ...sub, status: 'expired', plan: 'free' };
  }

  return sub || { plan: 'free', status: 'active', billingCycle: null };
}

/**
 * Cancel subscription
 */
async function cancelSubscription(userId) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub || sub.plan === 'free') throw new Error('No active subscription to cancel');

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });

  return { message: 'Subscription cancelled. Access continues until period end.' };
}

module.exports = {
  createOrder,
  verifyPayment,
  activateSubscription,
  getSubscription,
  cancelSubscription,
  PLAN_PRICES,
  PLAN_NAMES,
};

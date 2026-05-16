'use client';

/**
 * Subscription Page — /dashboard/subscription
 * Integrated with Razorpay payment gateway.
 * 3-tier pricing: Free / Pro (₹499/mo) / Elite (₹999/mo)
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

interface SubscriptionData {
  plan: string;
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    description: 'Get started with basic features',
    features: [
      'Basic workout plans',
      'Track up to 3 exercises',
      'Weekly progress summary',
      'Community access',
      'Limited AI suggestions',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹499',
    period: '/month',
    description: 'For serious fitness enthusiasts',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Unlimited workout plans',
      'AI-powered personalized routines',
      'Advanced analytics & insights',
      'Nutrition tracking',
      'Priority support',
      'Custom workout builder',
      'Progress photos & comparison',
      'Export data (PDF/CSV)',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₹999',
    period: '/month',
    description: 'Maximum results with premium features',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      '1-on-1 AI coach conversations',
      'Advanced body composition tracking',
      'Meal planning with recipes',
      'Video exercise library (HD)',
      'Recovery & sleep optimization',
      'Dedicated support channel',
      'Early access to new features',
      'Multi-device sync',
      'Family sharing (up to 3)',
    ],
  },
];

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: () => void) => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionData>({ plan: 'free', status: 'active', billingCycle: null, currentPeriodEnd: null, cancelledAt: null });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await api.get<{ subscription: SubscriptionData }>('/subscription');
      if (res.data?.subscription) {
        setCurrentSubscription(res.data.subscription);
      }
    } catch {
      // Default to free
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getPrice = (plan: Plan) => {
    if (plan.id === 'free') return '₹0';
    if (billingCycle === 'yearly') {
      const monthly = plan.id === 'pro' ? 499 : 999;
      const yearly = Math.round(monthly * 10);
      return `₹${yearly.toLocaleString('en-IN')}`;
    }
    return plan.price;
  };

  const getPeriod = (plan: Plan) => {
    if (plan.id === 'free') return 'forever';
    return billingCycle === 'yearly' ? '/year' : '/month';
  };

  const getSavings = (plan: Plan) => {
    if (plan.id === 'free' || billingCycle !== 'yearly') return null;
    const monthly = plan.id === 'pro' ? 499 : 999;
    const saved = monthly * 2;
    return `Save ₹${saved.toLocaleString('en-IN')}/year`;
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;
    setProcessing(planId);
    setMessage(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage({ type: 'error', text: 'Failed to load payment gateway. Please try again.' });
        setProcessing(null);
        return;
      }

      const orderRes = await api.post<{
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        planId: string;
        billingCycle: string;
      }>('/subscription/create-order', { planId, billingCycle });

      const orderData = orderRes.data;
      if (!orderData) throw new Error('Failed to create order');

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'RIX Fitness',
        description: `${planId === 'pro' ? 'Pro' : 'Elite'} Plan — ${billingCycle}`,
        order_id: orderData.orderId,
        prefill: {
          email: user?.email || '',
          name: user ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
        },
        theme: { color: '#000000' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await api.post('/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId,
              billingCycle,
            });
            setMessage({ type: 'success', text: `🎉 Welcome to RIX ${planId === 'pro' ? 'Pro' : 'Elite'}! Your subscription is now active.` });
            fetchSubscription();
          } catch {
            setMessage({ type: 'error', text: 'Payment was received but verification failed. Please contact support.' });
          }
          setProcessing(null);
        },
        modal: {
          ondismiss: () => {
            setProcessing(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setMessage({ type: 'error', text: 'Payment failed. Please try again or use a different payment method.' });
        setProcessing(null);
      });
      rzp.open();
    } catch {
      setMessage({ type: 'error', text: 'Failed to initiate payment. Please try again.' });
      setProcessing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) return;
    setCancelling(true);
    try {
      await api.post('/subscription/cancel', {});
      setMessage({ type: 'success', text: 'Subscription cancelled. You can continue using your plan until the current period ends.' });
      fetchSubscription();
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel subscription. Please try again.' });
    } finally {
      setCancelling(false);
    }
  };

  const isCurrentPlan = (planId: string) => currentSubscription.plan === planId;
  const isActivePaid = currentSubscription.plan !== 'free' && currentSubscription.status === 'active';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
      {/* Status Banner */}
      {isActivePaid && (
        <div className="mb-8 px-5 py-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <p className="text-sm font-semibold text-white">
              You&apos;re on <span className="uppercase">{currentSubscription.plan}</span>
              {currentSubscription.billingCycle && ` (${currentSubscription.billingCycle})`}
            </p>
            {currentSubscription.currentPeriodEnd && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {currentSubscription.status === 'cancelled'
                  ? `Access until ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `Renews on ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`
                }
              </p>
            )}
          </div>
          {currentSubscription.status === 'active' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[10px] tracking-[0.15em] uppercase font-semibold px-4 py-2 transition-all cursor-pointer disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Plan'}
            </button>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? '#4ade80' : '#f87171',
          }}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Choose Your Plan
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          Unlock your full fitness potential with RIX Pro or Elite
        </p>

        {/* Billing toggle */}
        <div className="mt-6 inline-flex items-center gap-3 p-1.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: billingCycle === 'monthly' ? 'var(--color-primary)' : 'transparent',
              color: billingCycle === 'monthly' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: billingCycle === 'yearly' ? 'var(--color-primary)' : 'transparent',
              color: billingCycle === 'yearly' ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Yearly <span className="text-xs ml-1 opacity-80">(-17%)</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className="relative rounded-2xl border p-6 flex flex-col transition-all duration-300"
            style={{
              background: 'var(--bg-card)',
              borderColor: plan.highlighted ? 'var(--color-primary)' : 'var(--border-color)',
              boxShadow: plan.highlighted ? '0 0 30px rgba(255,255,255,0.08)' : 'none',
            }}
          >
            {/* Badge */}
            {plan.badge && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: plan.highlighted ? '#fff' : 'var(--bg-hover)',
                  color: plan.highlighted ? '#000' : 'var(--text-secondary)',
                  border: plan.highlighted ? 'none' : '1px solid var(--border-color)',
                }}
              >
                {plan.badge}
              </div>
            )}

            {/* Current plan indicator */}
            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{ background: '#22c55e', color: '#fff' }}>
                Current
              </div>
            )}

            {/* Plan name */}
            <h3 className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
              {plan.name}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {plan.description}
            </p>

            {/* Price */}
            <div className="mt-4 mb-1">
              <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {getPrice(plan)}
              </span>
              <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                {getPeriod(plan)}
              </span>
            </div>
            {getSavings(plan) && (
              <span className="text-xs font-medium" style={{ color: '#16a34a' }}>
                {getSavings(plan)}
              </span>
            )}

            {/* Features */}
            <ul className="mt-6 space-y-3 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: plan.highlighted ? '#fff' : '#16a34a' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              className="mt-6 w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isCurrentPlan(plan.id) || processing !== null}
              onClick={() => handleUpgrade(plan.id)}
              style={
                isCurrentPlan(plan.id)
                  ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                  : plan.highlighted
                    ? { background: '#fff', color: '#000', letterSpacing: '0.05em', textTransform: 'uppercase' as const }
                    : { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }
              }
            >
              {processing === plan.id ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : isCurrentPlan(plan.id)
                ? 'Current Plan'
                : plan.id === 'free'
                  ? 'Downgrade'
                  : 'Upgrade Now'
              }
            </button>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <FAQ q="Can I cancel anytime?" a="Yes! You can cancel your subscription anytime. You'll continue to have access until the end of your billing period." />
          <FAQ q="What payment methods do you accept?" a="We accept UPI, credit cards, debit cards, and net banking through Razorpay." />
          <FAQ q="Is there a free trial for Pro/Elite?" a="Yes! New users get a 7-day free trial of Pro features when they sign up." />
          <FAQ q="Can I switch between plans?" a="Absolutely. You can upgrade or downgrade at any time. Pro-rated charges will be applied." />
          <FAQ q="Is my payment secure?" a="Yes. All payments are processed securely by Razorpay, which is PCI DSS compliant. We never store your card details." />
        </div>
      </div>

      {/* Razorpay badge */}
      <div className="mt-10 text-center pb-6">
        <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Payments secured by Razorpay 🔒
        </p>
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{q}</span>
        <svg
          className="w-4 h-4 transition-transform flex-shrink-0 ml-4"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 -mt-1">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a}</p>
        </div>
      )}
    </div>
  );
}

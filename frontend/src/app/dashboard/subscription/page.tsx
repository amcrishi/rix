'use client';

/**
 * Subscription Page — /dashboard/subscription
 * 3-tier pricing: Free / Pro (₹499/mo) / Elite (₹999/mo)
 */

import { useState } from 'react';

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

export default function SubscriptionPage() {
  const [currentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (plan: Plan) => {
    if (plan.id === 'free') return '₹0';
    if (billingCycle === 'yearly') {
      const monthly = plan.id === 'pro' ? 499 : 999;
      const yearly = Math.round(monthly * 10); // 2 months free
      return `₹${yearly}`;
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
    return `Save ₹${saved}/year`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-0">
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
              className="mt-6 w-full py-3 rounded-xl text-sm font-bold transition-all duration-300"
              disabled={currentPlan === plan.id}
              style={
                currentPlan === plan.id
                  ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }
                  : plan.highlighted
                    ? { background: '#fff', color: '#000', letterSpacing: '0.05em', textTransform: 'uppercase' as const }
                    : { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }
              }
            >
              {currentPlan === plan.id ? 'Current Plan' : plan.id === 'free' ? 'Downgrade' : 'Upgrade Now'}
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
          <FAQ
            q="Can I cancel anytime?"
            a="Yes! You can cancel your subscription anytime. You'll continue to have access until the end of your billing period."
          />
          <FAQ
            q="What payment methods do you accept?"
            a="We accept UPI, credit cards, debit cards, and net banking through Razorpay."
          />
          <FAQ
            q="Is there a free trial for Pro/Elite?"
            a="Yes! New users get a 7-day free trial of Pro features when they sign up."
          />
          <FAQ
            q="Can I switch between plans?"
            a="Absolutely. You can upgrade or downgrade at any time. Pro-rated charges will be applied."
          />
        </div>
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
        className="w-full flex items-center justify-between p-4 text-left"
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

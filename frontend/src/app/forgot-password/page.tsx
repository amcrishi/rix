'use client';

/**
 * Forgot Password Page — matching premium design.
 * Step 1: Enter email → validate against DB.
 *   - Not found → popup message + redirect to /register
 *   - Found     → show new password + confirm password fields
 * Step 2: Submit new password → reset and redirect to /login
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RixLogo } from '@/components/ui/RixLogo';

type Step = 'email' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const API = '/api';

  // Step 1: Check if email exists
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.exists) {
        setStep('reset');
      } else {
        setShowPopup(true);
        setTimeout(() => {
          setShowPopup(false);
          router.push('/register');
        }, 3000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('done');
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setError(data.message || 'Reset failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-500"
      style={{ background: '#050507' }}
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[15%] left-[25%] w-[450px] h-[450px] rounded-full animate-float-slow animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[15%] right-[20%] w-[350px] h-[350px] rounded-full animate-float-reverse animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            animationDelay: '2s'
          }}
        />
        <div className="absolute inset-0"
          style={{
            opacity: 0.04,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #050507 75%)' }} />
      </div>

      {/* Not-registered popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative rounded-2xl px-8 py-7 shadow-2xl text-center max-w-sm mx-4 animate-fade-in"
            style={{
              background: '#0f1116',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <AlertIcon />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#fff' }}>
              Account Not Found
            </h3>
            <p className="text-sm leading-relaxed mb-1" style={{ color: '#6b7280' }}>
              This email is not registered.
            </p>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Redirecting you to Sign Up…
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block mb-5">
            <RixLogo size={52} variant="dark" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight transition-colors duration-300"
            style={{ color: '#ffffff' }}
          >
            {step === 'done' ? 'Password Updated' : 'Reset Password'}
          </h1>
          <p className="text-sm mt-2 font-medium max-w-[300px] mx-auto" style={{ color: '#6b7280' }}>
            {step === 'email' && "Enter your email and we'll verify your account."}
            {step === 'reset' && 'Choose a new password for your account.'}
            {step === 'done' && 'Your password has been reset. Redirecting to login…'}
          </p>
        </div>

        {/* Glittering Card */}
        <div className="glitter-border">
          <div className="rounded-2xl p-7 shadow-2xl backdrop-blur-xl transition-colors duration-300"
            style={{
              background: '#0f1116',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Step 1 — Email */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: '#9ca3af' }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:border-white/40 focus:ring-2 focus:ring-white/10"
                    style={{
                      color: '#fff',
                      background: '#1a1d26',
                      border: '1px solid #2a2d38',
                    }}
                    placeholder="Enter your email"
                  />
                </div>
                {error && <p className="text-xs text-neutral-400">{error}</p>}
                <CKButton loading={loading} label="VERIFY EMAIL" loadingLabel="VERIFYING..." />
              </form>
            )}

            {/* Step 2 — New Password */}
            {step === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: '#9ca3af' }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:border-white/40 focus:ring-2 focus:ring-white/10"
                    style={{
                      color: '#fff',
                      background: '#1a1d26',
                      border: '1px solid #2a2d38',
                    }}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                    style={{ color: '#9ca3af' }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:border-white/40 focus:ring-2 focus:ring-white/10"
                    style={{
                      color: '#fff',
                      background: '#1a1d26',
                      border: '1px solid #2a2d38',
                    }}
                    placeholder="Confirm new password"
                  />
                </div>
                {error && <p className="text-xs text-neutral-400">{error}</p>}
                <CKButton loading={loading} label="RESET PASSWORD" loadingLabel="RESETTING..." />
              </form>
            )}

            {/* Step 3 — Done */}
            {step === 'done' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  <CheckIcon />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#fff' }}>
                  Password Reset!
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  You can now log in with your new password.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back to login */}
        <div className="mt-7 text-center">
          <Link href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: '#6b7280' }}
          >
            <ArrowLeftIcon />
            Back to sign in
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-5 text-[11px] font-medium uppercase tracking-wider"
          style={{ color: '#374151' }}>
          <Link href="#" className="hover:opacity-70 transition-opacity">Terms</Link>
          <span className="w-1 h-1 rounded-full" style={{ background: '#374151' }} />
          <Link href="#" className="hover:opacity-70 transition-opacity">Privacy</Link>
          <span className="w-1 h-1 rounded-full" style={{ background: '#374151' }} />
          <Link href="#" className="hover:opacity-70 transition-opacity">Docs</Link>
        </div>
      </div>

    </div>
  );
}

// --- Reusable button ---
function CKButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      style={{
        background: '#ffffff',
        color: '#000000',
        boxShadow: 'none',
      }}
      onMouseEnter={e => {
        if (!loading) {
          const el = e.currentTarget;
          el.style.background = '#000000';
          el.style.color = '#ffffff';
          el.style.transform = 'translateY(-1px)';
          el.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.3)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.background = '#ffffff';
        el.style.color = '#000000';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {loadingLabel}
        </span>
      ) : label}
    </button>
  );
}

// --- Icons ---
function CheckIcon() {
  return (
    <svg className="w-7 h-7 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="w-7 h-7 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

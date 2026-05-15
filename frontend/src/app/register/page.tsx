'use client';

/**
 * Register Page — 2-step signup with full client-side validation,
 * inline field errors, and password requirements checklist.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RixLogo } from '@/components/ui/RixLogo';
import { useAuth } from '@/context/AuthContext';

// Friendly labels for backend field names
const FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  password: 'Password',
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();
  const router = useRouter();

  // Password requirement checks
  const pwChecks = {
    length:    form.password.length >= 8,
    uppercase: /[A-Z]/.test(form.password),
    number:    /[0-9]/.test(form.password),
    lowercase: /[a-z]/.test(form.password),
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    setTopError('');
  };

  // Client-side validation before API call
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.firstName.trim()) errors.firstName = 'Please enter your first name.';
    if (!form.lastName.trim()) errors.lastName = 'Please enter your last name.';
    if (!form.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'That doesn\'t look like a valid email. Try again.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.password) {
      errors.password = 'Please create a password.';
    } else if (form.password.length < 8) {
      errors.password = 'Password is too short — minimum 8 characters.';
    } else if (!pwChecks.uppercase) {
      errors.password = 'Add at least one uppercase letter (e.g. A, B, C).';
    } else if (!pwChecks.lowercase) {
      errors.password = 'Add at least one lowercase letter (e.g. a, b, c).';
    } else if (!pwChecks.number) {
      errors.password = 'Add at least one number (e.g. 1, 2, 3).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (validateStep1()) setStep(2);
      return;
    }

    if (!validateStep2()) return;

    setTopError('');
    setLoading(true);

    const result = await register({
      email: form.email,
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
    });

    if (result.success) {
      router.push('/dashboard');
    } else {
      // Map backend field errors to friendly messages
      if (result.details && result.details.length > 0) {
        const mapped: Record<string, string> = {};
        result.details.forEach(({ field, message }) => {
          const label = FIELD_LABELS[field] || field;
          // Rewrite generic backend messages to user-friendly ones
          if (message.includes('8 characters')) {
            mapped[field] = 'Password needs at least 8 characters.';
          } else if (message.includes('uppercase') || message.includes('lowercase') || message.includes('number')) {
            mapped[field] = 'Password needs an uppercase letter, a lowercase letter, and a number.';
          } else if (message.includes('valid email')) {
            mapped[field] = 'That doesn\'t look like a valid email address.';
          } else if (message.includes('required') || message.includes('empty')) {
            mapped[field] = `${label} is required.`;
          } else {
            mapped[field] = message;
          }
        });
        // If step 2 has password error, stay on step 2
        if (mapped.password) {
          setFieldErrors(mapped);
        } else {
          // Step 1 field errors — go back to step 1
          setFieldErrors(mapped);
          setStep(1);
        }
      } else if (result.error?.toLowerCase().includes('already')) {
        setStep(1);
        setFieldErrors({ email: 'An account with this email already exists. Try signing in instead.' });
      } else {
        setTopError(result.error || 'Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => ({
    color: '#fff',
    background: '#1a1d26',
    border: `1px solid ${fieldErrors[field] ? '#666666' : '#2a2d38'}`,
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-500"
      style={{ background: '#050507' }}
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[5%] right-[20%] w-[500px] h-[500px] rounded-full animate-float-slow animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] rounded-full animate-float-reverse animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            animationDelay: '3s'
          }}
        />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #050507 75%)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[440px] px-6 py-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-5">
            <RixLogo size={52} variant="dark" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight"
            style={{ color: '#ffffff' }}>
            Join RIX
          </h1>
          <p className="text-sm mt-2 font-medium" style={{ color: '#6b7280' }}>
            Start your AI-powered fitness journey
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-7">
          <StepDot active={step >= 1} done={step > 1} label="1" />
          <div className="w-12 h-[2px] rounded-full transition-all duration-500"
            style={{ background: step >= 2 ? '#ffffff' : '#2a2d38' }}
          />
          <StepDot active={step >= 2} done={false} label="2" />
        </div>

        {/* Glittering Card */}
        <div className="glitter-border">
          <div className="rounded-2xl p-7 shadow-2xl backdrop-blur-xl transition-colors duration-300"
            style={{
              background: '#0f1116',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Top error banner */}
            {topError && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium border flex items-start gap-2"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  color: '#a3a3a3',
                }}
              >
                <span className="mt-0.5 flex-shrink-0">⚠️</span>
                <span>{topError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  {/* First Name + Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: '#9ca3af' }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={e => { setForm({ ...form, firstName: e.target.value }); clearFieldError('firstName'); }}
                        autoComplete="given-name"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-white/15"
                        placeholder="Rishi"
                      />
                      {fieldErrors.firstName && <FieldError msg={fieldErrors.firstName} />}
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: '#9ca3af' }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={e => { setForm({ ...form, lastName: e.target.value }); clearFieldError('lastName'); }}
                        autoComplete="family-name"
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-white/15"
                        style={inputStyle('lastName')}
                        placeholder="Sharma"
                      />
                      {fieldErrors.lastName && <FieldError msg={fieldErrors.lastName} />}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: '#9ca3af' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => { setForm({ ...form, email: e.target.value }); clearFieldError('email'); }}
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-white/15"
                      placeholder="you@example.com"
                    />
                    {fieldErrors.email && <FieldError msg={fieldErrors.email} />}
                  </div>
                </>
              ) : (
                <>
                  {/* Password */}
                  <div>
                    <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider"
                      style={{ color: '#9ca3af' }}>
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={e => { setForm({ ...form, password: e.target.value }); clearFieldError('password'); }}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-white/15"
                        style={inputStyle('password')}
                        placeholder="Create a strong password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                        style={{ color: '#4b5563' }}>
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    {fieldErrors.password && <FieldError msg={fieldErrors.password} />}

                    {/* Password requirements checklist */}
                    <div className="mt-3 p-3 rounded-xl space-y-1.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1f2937' }}
                    >
                      <p className="text-[11px] uppercase tracking-wider font-semibold mb-2"
                        style={{ color: '#4b5563' }}>
                        Password must include:
                      </p>
                      <Requirement met={pwChecks.length}    label="At least 8 characters" />
                      <Requirement met={pwChecks.uppercase} label="One uppercase letter (A–Z)" />
                      <Requirement met={pwChecks.lowercase} label="One lowercase letter (a–z)" />
                      <Requirement met={pwChecks.number}    label="One number (0–9)" />
                    </div>

                    <PasswordStrength password={form.password} />
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                    By creating an account, you agree to our{' '}
                    <Link href="#" className="text-white/70 hover:underline">Terms</Link>{' '}and{' '}
                    <Link href="#" className="text-white/70 hover:underline">Privacy Policy</Link>.
                  </p>
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: '#ffffff',
                  color: '#000000',
                  boxShadow: 'none',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner /> CREATING ACCOUNT...
                  </span>
                ) : step === 1 ? 'CONTINUE →' : 'CREATE ACCOUNT'}
              </button>

              {step === 2 && (
                <button type="button" onClick={() => { setStep(1); setFieldErrors({}); }}
                  className="w-full py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  style={{ color: '#6b7280' }}
                >
                  ← Back
                </button>
              )}
            </form>

            {step === 1 && (
              <>
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #2a2d38, transparent)' }} />
                  <span className="text-[11px] uppercase tracking-widest font-semibold"
                    style={{ color: '#4b5563' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #2a2d38, transparent)' }} />
                </div>
                <button type="button"
                  className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                  style={{ color: '#d1d5db', border: '1px solid #2a2d38', background: '#1a1d26' }}
                >
                  <GoogleIcon />
                  Sign up with Google
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom link */}
        <div className="mt-7 text-center">
          <p className="text-sm" style={{ color: '#6b7280' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-white font-semibold hover:opacity-80 transition-colors">
              Sign in →
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-5 text-[11px] font-medium uppercase tracking-wider"
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

/* ─── Sub-components ─── */

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 text-xs font-medium flex items-center gap-1"
      style={{ color: '#9ca3af' }}>
      <span>✕</span> {msg}
    </p>
  );
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold w-3 text-center"
        style={{ color: met ? '#22c55e' : '#374151' }}>
        {met ? '✓' : '○'}
      </span>
      <span className="text-xs transition-colors"
        style={{ color: met ? '#86efac' : '#6b7280' }}>
        {label}
      </span>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500"
      style={{
        background: active ? '#ffffff' : '#1a1d26',
        color: active ? '#000000' : '#4b5563',
        border: active ? 'none' : '1px solid #2a2d38',
        boxShadow: active ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
      }}
    >
      {done ? '✓' : label}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: 'Too weak', color: '#6b7280' };
    if (score === 2) return { level: 2, label: 'Getting there', color: '#9ca3af' };
    if (score === 3) return { level: 3, label: 'Good', color: '#d1d5db' };
    return { level: 4, label: 'Strong 💪', color: '#ffffff' };
  };
  const { level, label, color } = getStrength();
  if (!password) return null;
  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
            style={{ background: i <= level ? color : '#2a2d38' }}
          />
        ))}
      </div>
      <p className="text-xs mt-1.5 font-medium" style={{ color }}>{label}</p>
    </div>
  );
}

/* ─── Icons ─── */

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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

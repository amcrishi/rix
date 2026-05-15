'use client';

/**
 * Login Page — Ultra-premium design with animated background,
 * glittering card border, and monochrome CK theme.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RixLogo } from '@/components/ui/RixLogo';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials');
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
          className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full animate-float-slow animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[5%] right-[15%] w-[400px] h-[400px] rounded-full animate-float-reverse animate-pulse-glow"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            animationDelay: '2s'
          }}
        />
        <div
          className="absolute top-[50%] right-[30%] w-[300px] h-[300px] rounded-full animate-float-slow"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 70%)',
            animationDelay: '4s'
          }}
        />
        {/* Grid overlay */}
        <div className="absolute inset-0"
          style={{
            opacity: 0.04,
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #050507 75%)' }} />
      </div>

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
            Continue the Grind
          </h1>
          <p className="text-sm mt-2 font-medium transition-colors duration-300"
            style={{ color: '#6b7280' }}
          >
            Every rep counts. Let&apos;s go.
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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-semibold mb-2 uppercase tracking-wider transition-colors duration-300"
                  style={{ color: '#9ca3af' }}
                >
                  Email
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[13px] font-semibold uppercase tracking-wider transition-colors duration-300"
                    style={{ color: '#9ca3af' }}
                  >
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-white/50 hover:text-white transition-colors font-medium">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all duration-300 focus:border-white/40 focus:ring-2 focus:ring-white/10"
                    style={{
                      color: '#fff',
                      background: '#1a1d26',
                      border: '1px solid #2a2d38',
                    }}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#4b5563' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium border"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    color: '#a3a3a3',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300 relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                    Signing in...
                  </span>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #2a2d38, transparent)' }} />
              <span className="text-[11px] uppercase tracking-widest font-semibold"
                style={{ color: '#4b5563' }}
              >or</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #2a2d38, transparent)' }} />
            </div>

            {/* Social Login */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
              style={{
                color: '#d1d5db',
                border: '1px solid #2a2d38',
                background: '#1a1d26',
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>
        </div>

        {/* Bottom link */}
        <div className="mt-7 text-center">
          <p className="text-sm" style={{ color: '#6b7280' }}>
            New to RIX?{' '}
            <Link href="/register" className="text-white font-semibold hover:opacity-80 transition-colors">
              Create an account →
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 flex items-center justify-center gap-5 text-[11px] font-medium uppercase tracking-wider"
          style={{ color: '#374151' }}
        >
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

// --- Icons ---

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

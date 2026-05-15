'use client';

/**
 * Dashboard Layout — Calvin Klein editorial aesthetic.
 * Top horizontal nav bar: brand left, nav center, user right.
 * Full-width B&W video background behind all content.
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RixLogo } from '@/components/ui/RixLogo';
import { useAuth } from '@/context/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 border border-current rounded-full animate-spin opacity-40" style={{ borderTopColor: 'transparent', color: '#fff' }} />
          <p className="text-[10px] tracking-[0.3em] uppercase font-medium opacity-40 text-white">Loading</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: '#000' }}>

      {/* ── Full-screen B&W video background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          src="/workout-bg.mp4"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'grayscale(100%) brightness(0.4) contrast(1.1)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)' }} />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-10"
        style={{
          height: '56px',
          background: 'rgba(0,0,0,0.72)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Left — Brand */}
        <Link href="/dashboard" className="shrink-0">
          <RixLogo size={22} variant="dark" />
        </Link>

        {/* Center — Navigation (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-1">
          <NavItem href="/dashboard" label="Dashboard" />
          <NavItem href="/dashboard/workouts" label="Workouts" />
          <NavItem href="/dashboard/diet" label="Diet" />
          <NavItem href="/dashboard/progress" label="Progress" />
          <NavItem href="/dashboard/profile" label="Profile" />
          <NavItem href="/dashboard/subscription" label="Subscription" />
        </nav>

        {/* Hamburger — mobile only */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 cursor-pointer"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-[3.5px]' : ''}`} />
          <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-px bg-white transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-[3.5px]' : ''}`} />
        </button>

        {/* Right — User / Sign out */}
        <div className="hidden md:flex items-center gap-5 shrink-0">
          {user && (
            <Link
              href="/dashboard/profile"
              className="text-[11px] tracking-[0.15em] uppercase font-medium text-white opacity-50 hidden md:inline transition-opacity duration-200 hover:opacity-100"
            >
              {user.firstName} {user.lastName ?? ''}
            </Link>
          )}
          <div className="w-px h-3 bg-white opacity-15 hidden md:block" />
          <button
            onClick={logout}
            className="text-[11px] tracking-[0.15em] uppercase font-medium text-white opacity-50 transition-all duration-200 hover:opacity-100 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div
          className="md:hidden sticky top-[56px] z-20 flex flex-col py-3 px-4 gap-1"
          style={{
            background: 'rgba(0,0,0,0.92)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/workouts', label: 'Workouts' },
            { href: '/dashboard/diet', label: 'Diet' },
            { href: '/dashboard/progress', label: 'Progress' },
            { href: '/dashboard/profile', label: 'Profile' },
            { href: '/dashboard/subscription', label: 'Subscription' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 text-[11px] tracking-[0.2em] uppercase font-semibold text-white opacity-70 hover:opacity-100 transition-opacity"
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-white/10 mt-2 pt-2 flex items-center justify-between px-3">
            {user && (
              <span className="text-[11px] tracking-[0.15em] uppercase font-medium text-white opacity-50">
                {user.firstName} {user.lastName ?? ''}
              </span>
            )}
            <button
              onClick={() => { setMobileMenuOpen(false); logout(); }}
              className="text-[11px] tracking-[0.15em] uppercase font-medium text-white opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 relative z-10 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className="relative px-4 py-1 transition-all duration-200"
      style={{ color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; }}
    >
      <span className="text-[11px] tracking-[0.2em] uppercase font-semibold">{label}</span>
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-white" />
      )}
    </Link>
  );
}


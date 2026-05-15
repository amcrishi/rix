'use client';

/**
 * TopBar — video background edition.
 * Glassmorphism bar, always white text over dark video.
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/workouts': 'Workouts',
  '/dashboard/progress': 'Progress',
  '/dashboard/profile': 'Profile',
  '/dashboard/subscription': 'Subscription',
};

export default function TopBar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'Dashboard';
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-10 py-4"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <h2 className="text-[10px] font-bold tracking-[0.35em] uppercase text-white">
        {title}
      </h2>

      <div className="flex items-center gap-6">
        {isAuthenticated && user ? (
          <>
            <span className="text-[10px] tracking-[0.2em] uppercase font-medium text-white opacity-50">
              {user.firstName} {user.lastName ?? ''}
            </span>
            <div className="w-px h-3 bg-white opacity-20" />
            <button
              onClick={logout}
              className="text-[10px] tracking-[0.2em] uppercase font-medium text-white opacity-50 transition-all duration-200 hover:opacity-100"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-[10px] tracking-[0.2em] uppercase font-medium text-white opacity-70 hover:opacity-100 transition-opacity"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}


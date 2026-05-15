'use client';

/**
 * Auth Context — manages JWT session across the app.
 * Provides user state, login/register/logout functions.
 * Protects dashboard routes — redirects to /login if unauthenticated.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, setToken, clearToken } from '@/lib/api';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; details?: Array<{ field: string; message: string }> }>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PROTECTED_PREFIX = '/dashboard';
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('fitness_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<{ user: AuthUser }>('/auth/me');
        if (res.success && res.data) {
          setUser(res.data.user);
        } else {
          clearToken();
        }
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Route protection
  useEffect(() => {
    if (loading) return;

    const isProtected = pathname.startsWith(PROTECTED_PREFIX);
    const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname === '/';

    if (isProtected && !user) {
      router.replace('/login');
    }

    if (isPublic && user && pathname !== '/') {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ user: AuthUser; token: string }>('/auth/login', { email, password });
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, error: res.message || 'Login failed' };
    } catch (err: unknown) {
      const error = err as { message?: string };
      return { success: false, error: error.message || 'Invalid credentials' };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await api.post<{ user: AuthUser; token: string }>('/auth/register', data);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        return { success: true };
      }
      return { success: false, error: res.message || 'Registration failed' };
    } catch (err: unknown) {
      const error = err as { message?: string; details?: Array<{ field: string; message: string }> };
      // If backend returns field-level validation details, return them for the form to display
      if (error.details && error.details.length > 0) {
        return {
          success: false,
          error: error.message || 'Please fix the errors below',
          details: error.details,
        };
      }
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * API utility for communicating with the backend.
 * Handles token attachment, error parsing, and base URL config.
 */

// Use relative URL — Next.js rewrites proxy /api/* to the backend.
// This avoids all CORS and hostname issues when accessing from other devices.
const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string; details?: Array<{ field: string; message: string }> };
}

/**
 * Get stored auth token from localStorage.
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fitness_token');
}

/**
 * Save auth token to localStorage.
 */
export function setToken(token: string): void {
  localStorage.setItem('fitness_token', token);
}

/**
 * Clear auth token (logout).
 */
export function clearToken(): void {
  localStorage.removeItem('fitness_token');
}

/**
 * Make an authenticated API request.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.error?.message || 'Something went wrong',
      details: data.error?.details,
    };
  }

  return data;
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};

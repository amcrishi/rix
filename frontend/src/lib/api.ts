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

export interface ApiError {
  status: number;
  message: string;
  details?: Array<{ field: string; message: string }>;
  retryAfter?: number;
}

/**
 * Human-readable fallback for a status code, used when the server sends
 * nothing useful (or sends HTML instead of JSON).
 */
function fallbackMessage(status: number): string {
  if (status === 0) return "Can't reach the server. Check your connection and try again.";
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have access to this.";
  if (status === 404) return "That doesn't exist, or it hasn't finished deploying yet.";
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500 && status < 600) return 'The server is having trouble. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}

/**
 * Pull a message out of whatever the server actually returned.
 * The API normally sends { error: { message } }, but the rate limiter sends
 * { error: "..." } as a plain string, and proxies can send HTML.
 */
function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { error?: unknown; message?: unknown };

  if (typeof b.error === 'string' && b.error.trim()) return b.error;
  if (b.error && typeof b.error === 'object') {
    const inner = (b.error as { message?: unknown }).message;
    if (typeof inner === 'string' && inner.trim()) return inner;
  }
  if (typeof b.message === 'string' && b.message.trim()) return b.message;
  return null;
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
 * Always rejects with an ApiError carrying a message safe to show a user.
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch {
    // Network failure, DNS, CORS, offline — fetch rejects with no status.
    const err: ApiError = { status: 0, message: fallbackMessage(0) };
    throw err;
  }

  // A proxy or crashed server can return HTML, so parsing may fail.
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const retryHeader = response.headers.get('retry-after');
    const retryAfter = retryHeader ? parseInt(retryHeader, 10) : undefined;

    let message = extractMessage(body) || fallbackMessage(response.status);
    if (response.status === 429 && retryAfter && Number.isFinite(retryAfter)) {
      message = `Too many requests. Please wait ${retryAfter}s and try again.`;
    }

    const err: ApiError = {
      status: response.status,
      message,
      details: (body as ApiResponse<T> | null)?.error?.details,
      ...(Number.isFinite(retryAfter) ? { retryAfter } : {}),
    };
    throw err;
  }

  return (body || { success: true }) as ApiResponse<T>;
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

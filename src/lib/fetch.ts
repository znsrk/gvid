import { API_BASE } from './api';
import { supabase } from './supabase';

// Cache auth token to avoid calling supabase.auth.getSession() on every request
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  // Use cached token if it has > 60s of life left
  if (cachedToken && tokenExpiresAt - now > 60_000) {
    return { Authorization: `Bearer ${cachedToken}` };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    cachedToken = session.access_token;
    // session.expires_at is seconds since epoch
    tokenExpiresAt = (session.expires_at || 0) * 1000;
    headers['Authorization'] = `Bearer ${cachedToken}`;
  } else {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
  return headers;
}

// Clear cache on auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.access_token) {
    cachedToken = session.access_token;
    tokenExpiresAt = (session.expires_at || 0) * 1000;
  } else {
    cachedToken = null;
    tokenExpiresAt = 0;
  }
});

// Authenticated fetch wrapper
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
}

// Authenticated fetch with JSON body
export async function apiPost(path: string, body: any): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiPut(path: string, body: any): Promise<Response> {
  return apiFetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<Response> {
  return apiFetch(path, { method: 'DELETE' });
}

// Authenticated FormData fetch (for file uploads)
export async function apiFormData(path: string, formData: FormData): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  return fetch(url, {
    method: 'POST',
    headers: authHeaders, // no Content-Type — browser sets it for FormData
    body: formData,
  });
}

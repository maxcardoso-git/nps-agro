import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import type { AuthSession } from '@/lib/types';

function encodeSession(session: AuthSession): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(session))));
}

function decodeSession(value: string): AuthSession | null {
  try {
    const json = decodeURIComponent(escape(atob(value)));
    return JSON.parse(json) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof document === 'undefined') {
    return;
  }

  const encoded = encodeSession(session);
  const maxAge = session.expires_in || 3600;
  document.cookie = `${SESSION_COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function readSession(): AuthSession | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookieValue = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split('=')[1];

  if (cookieValue) {
    const fromCookie = decodeSession(cookieValue);
    if (fromCookie?.access_token) {
      return fromCookie;
    }
  }

  return null;
}

export function clearSession(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

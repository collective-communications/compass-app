/**
 * Session cookie manager for anonymous survey save-and-resume.
 * Uses device-bound cookies (no account linkage) to maintain survey progress.
 * Falls back to sessionStorage when cookies are unavailable.
 */
import { getSessionCookieName } from '@compass/types';

const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const COOKIE_PATH = '/s/';

/** Get the completion cookie name for a deployment */
function getCompletionCookieName(deploymentId: string): string {
  return `cc_completed_${deploymentId}`;
}

/** Check if cookies are available in the current environment */
function cookiesAvailable(): boolean {
  try {
    document.cookie = '__cc_test=1; SameSite=Strict';
    const available = document.cookie.includes('__cc_test');
    document.cookie = '__cc_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    return available;
  } catch {
    return false;
  }
}

/** Set a cookie with standard survey cookie options */
function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=${COOKIE_PATH}; SameSite=Strict; Secure; max-age=${maxAge}`;
}

/** Read a cookie value by name */
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export const SessionCookieManager = {
  /**
   * Get or create a session token for a deployment.
   * Generates a UUID v4 if no existing session is found.
   */
  getOrCreateSession(deploymentId: string): string {
    const cookieName = getSessionCookieName(deploymentId);

    if (cookiesAvailable()) {
      const existing = getCookie(cookieName);
      if (existing) return existing;

      const token = crypto.randomUUID();
      setCookie(cookieName, token, COOKIE_MAX_AGE_SECONDS);
      return token;
    }

    // Fallback to sessionStorage
    const storageKey = cookieName;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const token = crypto.randomUUID();
    sessionStorage.setItem(storageKey, token);
    return token;
  },

  /** Read the current session token without creating one */
  getSession(deploymentId: string): string | null {
    const cookieName = getSessionCookieName(deploymentId);

    if (cookiesAvailable()) {
      return getCookie(cookieName);
    }

    return sessionStorage.getItem(cookieName);
  },

  /** Mark a deployment as completed */
  markCompleted(deploymentId: string): void {
    const name = getCompletionCookieName(deploymentId);

    if (cookiesAvailable()) {
      setCookie(name, '1', COOKIE_MAX_AGE_SECONDS);
    } else {
      sessionStorage.setItem(name, '1');
    }
  },

  /** Check if a deployment has been completed on this device */
  isCompleted(deploymentId: string): boolean {
    const name = getCompletionCookieName(deploymentId);

    if (cookiesAvailable()) {
      return getCookie(name) === '1';
    }

    return sessionStorage.getItem(name) === '1';
  },
} as const;

/**
 * Navigation utility to handle return URLs and state persistence.
 * This helps avoid extremely long URLs that cause 400 Bad Request errors.
 */

const SESSION_KEYS = {
  REPORTS_LIST: 'last_reports_list_url',
  TICKETS_LIST: 'last_tickets_list_url',
};

/**
 * Saves the current list URL to session storage.
 * @param type The type of list (REPORTS or TICKETS)
 * @param url The full URL with query parameters
 */
export const saveListState = (type: 'REPORTS' | 'TICKETS', url: string) => {
  if (typeof window === 'undefined') return;
  const key =
    type === 'REPORTS' ? SESSION_KEYS.REPORTS_LIST : SESSION_KEYS.TICKETS_LIST;
  sessionStorage.setItem(key, url);
};

/**
 * Gets the last saved list URL from session storage.
 * @param type The type of list
 * @param fallback Deault URL if no saved state exists
 * @returns The saved URL or fallback
 */
export const getListState = (
  type: 'REPORTS' | 'TICKETS',
  fallback: string,
): string => {
  if (typeof window === 'undefined') return fallback;
  const key =
    type === 'REPORTS' ? SESSION_KEYS.REPORTS_LIST : SESSION_KEYS.TICKETS_LIST;
  return sessionStorage.getItem(key) || fallback;
};

/**
 * Helper to determine if a URL is too long and should be truncated/handled via session storage.
 * Standard limit is around 2048, but many proxies/servers are stricter (e.g. 1024 or 4096).
 */
export const isUrlTooLong = (url: string, limit = 1000): boolean => {
  return url.length > limit;
};

/**
 * Creates a safe return URL. If the URL is too long, it returns just the base path
 * and relies on session storage for the full state.
 */
export const getSafeReturnUrl = (url: string, basePath: string): string => {
  if (isUrlTooLong(url)) {
    return basePath;
  }
  return url;
};

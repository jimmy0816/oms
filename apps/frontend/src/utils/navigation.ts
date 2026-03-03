/**
 * Navigation utility to handle return URLs and state persistence.
 * This helps avoid extremely long URLs that cause 400 Bad Request errors.
 */

const SESSION_KEYS = {
  REPORTS_LIST: 'last_reports_list_url',
  TICKETS_LIST: 'last_tickets_list_url',
};

export const saveListState = (
  type: 'REPORTS' | 'TICKETS',
  url: string,
  query: any = {},
) => {
  if (typeof window === 'undefined') return;
  const key =
    type === 'REPORTS' ? SESSION_KEYS.REPORTS_LIST : SESSION_KEYS.TICKETS_LIST;
  sessionStorage.setItem(key, url);
  sessionStorage.setItem(`${key}_query`, JSON.stringify(query));
};

/**
 * Gets the last saved list query from session storage.
 */
export const getListQuery = (type: 'REPORTS' | 'TICKETS'): any => {
  if (typeof window === 'undefined') return null;
  const key =
    type === 'REPORTS' ? SESSION_KEYS.REPORTS_LIST : SESSION_KEYS.TICKETS_LIST;
  const data = sessionStorage.getItem(`${key}_query`);
  return data ? JSON.parse(data) : null;
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
 * Standard limit is around 4096-8192 bytes for headers.
 * We use 800 to be very safe and leave room for cookies/other headers.
 */
export const isUrlTooLong = (url: string, limit = 800): boolean => {
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

/**
 * Resolves the final return URL to navigate to.
 * If returnUrl is just the base path (indicating truncation or default),
 * it tries to recover the state from session storage.
 */
export const resolveReturnUrl = (
  type: 'REPORTS' | 'TICKETS',
  returnUrl: string | string[] | undefined,
  basePath: string,
): string => {
  const url = Array.isArray(returnUrl) ? returnUrl[0] : returnUrl;

  const savedUrl = getListState(type, basePath);

  // If provided returnUrl is actually the base path (indicating truncation/default)
  // OR if provided returnUrl is itself too long
  const isBase = !url || url === basePath;
  const isTooLong = !!url && isUrlTooLong(url);

  if (isBase || isTooLong) {
    if (isUrlTooLong(savedUrl)) {
      return `${basePath}?restored=1`;
    }
    return savedUrl;
  }

  return url;
};

/**
 * Resolves the full query object by merging URL parameters with session storage if 'restored=1' is set.
 */
export const resolveFullQuery = (
  type: 'REPORTS' | 'TICKETS',
  currentQuery: any,
): any => {
  if (currentQuery.restored === '1') {
    const savedQuery = getListQuery(type);
    if (savedQuery) {
      // Merge saved query with any non-empty current query parameters
      return { ...savedQuery, ...currentQuery };
    }
  }
  return currentQuery;
};

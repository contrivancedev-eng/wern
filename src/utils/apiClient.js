// Centralized fetch wrapper. All server calls should flow through this so
// that expired / invalid tokens trigger a single global logout instead of
// leaving the user stuck with silent 401 responses.

import { recordRequest, finalizeRequest } from './networkLogger';

let logoutHandler = null;
let isLoggingOut = false;

export const setLogoutHandler = (fn) => {
  logoutHandler = fn;
};

// Signals that the current session is dead. Backend returns 401 OR
// a 200-body with status=false + a typical "invalid/expired token" message.
const looksLikeExpiredToken = (response, parsedJson) => {
  if (response.status === 401 || response.status === 403) return true;
  const message = String(parsedJson?.message || '').toLowerCase();
  if (!message) return false;
  return (
    message.includes('expired') ||
    message.includes('invalid token') ||
    message.includes('unauthorized') ||
    message.includes('invalid session') ||
    message.includes('please log') // "please login again"
  );
};

const triggerGlobalLogout = () => {
  if (isLoggingOut || !logoutHandler) return;
  isLoggingOut = true;
  try {
    logoutHandler();
  } finally {
    // allow another logout after a short beat in case the user signs
    // back in and hits another stale request already in flight
    setTimeout(() => { isLoggingOut = false; }, 2000);
  }
};

// Dev-only network logger — mirrors what you'd see in a browser's Network
// tab. Visible in Metro / `adb logcat` when the app is built in __DEV__.
const logRequest = (method, url, status, durationMs, body) => {
  if (!__DEV__) return;
  const ok = status >= 200 && status < 300;
  const tag = ok ? '✅' : '❌';
  // Strip token query param for cleaner logs.
  const cleanUrl = String(url).replace(/([?&])token=[^&]+/, '$1token=***');
  // eslint-disable-next-line no-console
  console.log(`${tag} [API] ${method} ${status} ${durationMs}ms — ${cleanUrl}`);
  if (body !== undefined) {
    // eslint-disable-next-line no-console
    console.log('   ↳ response:', body);
  }
};

export const apiFetch = async (input, init = {}) => {
  const method = (init?.method || 'GET').toUpperCase();
  const startedAt = Date.now();
  const logId = recordRequest({
    method,
    url: input,
    requestBody: init?.body,
    requestHeaders: init?.headers,
  });

  let response;
  try {
    response = await fetch(input, init);
  } catch (e) {
    finalizeRequest(logId, { status: 0, responseBody: null, error: e?.message });
    logRequest(method, input, 0, Date.now() - startedAt, `network error: ${e?.message}`);
    throw e;
  }

  let parsed = null;
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      parsed = await response.clone().json();
    } catch {
      parsed = null;
    }
  }

  finalizeRequest(logId, { status: response.status, responseBody: parsed, error: null });
  logRequest(method, input, response.status, Date.now() - startedAt, parsed);

  if (looksLikeExpiredToken(response, parsed)) {
    triggerGlobalLogout();
  }

  return { response, json: parsed };
};

// In-memory ring buffer of API calls, consumed by the in-app Dev Menu.
// Kept intentionally framework-free so apiClient can push to it without
// pulling in React.

const MAX_ENTRIES = 200;
const entries = [];
const listeners = new Set();
let nextId = 1;

const notify = () => {
  listeners.forEach((fn) => {
    try { fn(entries); } catch { /* silent */ }
  });
};

// FormData has no JSON serializer — walk it into a plain object for display.
const serializeBody = (body) => {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const out = {};
    try {
      const parts = body._parts || [];
      parts.forEach(([k, v]) => {
        // Mask token in case it was sent via form-data.
        out[k] = k === 'token' ? '***' : v;
      });
    } catch { /* silent */ }
    return out;
  }
  try { return JSON.parse(JSON.stringify(body)); } catch { return String(body); }
};

const maskUrl = (url) =>
  String(url).replace(/([?&])token=[^&]+/, '$1token=***');

export const recordRequest = ({ method, url, requestBody, requestHeaders }) => {
  const id = nextId++;
  const entry = {
    id,
    method: (method || 'GET').toUpperCase(),
    url: maskUrl(url),
    rawUrl: String(url),
    requestBody: serializeBody(requestBody),
    requestHeaders: requestHeaders || null,
    status: null,
    durationMs: null,
    responseBody: null,
    error: null,
    startedAt: Date.now(),
    endedAt: null,
  };
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  notify();
  return id;
};

export const finalizeRequest = (id, { status, responseBody, error }) => {
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  entry.status = status ?? 0;
  entry.responseBody = serializeBody(responseBody);
  entry.error = error || null;
  entry.endedAt = Date.now();
  entry.durationMs = entry.endedAt - entry.startedAt;
  notify();
};

export const getEntries = () => entries;
export const clearEntries = () => { entries.length = 0; notify(); };

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

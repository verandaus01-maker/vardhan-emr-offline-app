/**
 * Compute the correct sync/API server URL based on how the app is being accessed.
 *
 * Four deployment scenarios:
 *
 *   1. Native Android/iOS app (Capacitor) — protocol is 'capacitor:'
 *      → reads stored URL from localStorage (set in Settings → Mobile App Server URL)
 *      → falls back to hospital public IP http://1.22.20.11:3001
 *
 *   2. Cloud (Railway / Render) — HTTPS, no port in URL
 *      window.location = https://vardhan-emr.railway.app
 *      → serverUrl()  = https://vardhan-emr.railway.app   (same origin, /api/* routes)
 *
 *   3. Hospital local network — React on :3000, API on :3001
 *      window.location = http://192.168.1.131:3000
 *      → serverUrl()  = http://192.168.1.131:3001
 *
 *   4. Dev machine — same as local
 *      window.location = http://localhost:3000
 *      → serverUrl()  = http://localhost:3001
 *
 * This single function is the ONLY place the port mapping logic lives.
 */

const NATIVE_SERVER_KEY = 'nexacare_native_server_url';

/** Returns true when running inside the Capacitor native app (Android/iOS) */
export function isNativeApp() {
  return (
    window.location.protocol === 'capacitor:' ||
    !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  );
}

/** Save the hospital server URL for use by the native app */
export function setNativeServerUrl(url) {
  localStorage.setItem(NATIVE_SERVER_KEY, (url || '').trim().replace(/\/$/, ''));
}

/** Read the stored native server URL */
export function getNativeServerUrl() {
  return localStorage.getItem(NATIVE_SERVER_KEY) || '';
}

export function getServerUrl() {
  // Native app (Capacitor) — no meaningful window.location, use stored URL
  if (isNativeApp()) {
    const stored = getNativeServerUrl();
    if (stored) return stored;
    // Default fallback: hospital public IP on API port
    return 'http://1.22.20.11:3001';
  }

  const { protocol, hostname, port, host } = window.location;

  // Standard HTTP/HTTPS ports (cloud deployment) — API is on same origin
  if (!port || port === '80' || port === '443') {
    return `${protocol}//${host}`;
  }

  // Hospital local — React served on 3000, API served on 3001
  // Also handles if someone accesses directly on port 3001
  if (port === '3000' || port === '3001') {
    return `${protocol}//${hostname}:3001`;
  }

  // Unknown port — assume API is same origin (safest fallback)
  return `${protocol}//${host}`;
}

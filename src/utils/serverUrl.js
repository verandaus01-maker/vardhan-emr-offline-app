/**
 * Compute the correct sync/API server URL based on how the app is being accessed.
 *
 * Three deployment scenarios:
 *
 *   1. Cloud (Railway / Render) — HTTPS, no port in URL
 *      window.location = https://vardhan-emr.railway.app
 *      → serverUrl()  = https://vardhan-emr.railway.app   (same origin, /api/* routes)
 *
 *   2. Hospital local network — React on :3000, API on :3001
 *      window.location = http://192.168.1.131:3000
 *      → serverUrl()  = http://192.168.1.131:3001
 *
 *   3. Dev machine — same as local
 *      window.location = http://localhost:3000
 *      → serverUrl()  = http://localhost:3001
 *
 * This single function is the ONLY place the port mapping logic lives.
 */
export function getServerUrl() {
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

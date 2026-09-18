// Single place where the backend location lives, so the host/scheme can't drift
// between components (and can be overridden at build time).
//
// Default (production): same origin. The reverse proxy in front of the app serves
// the React build and forwards /api/* and /ws to the Spring backend, so the browser
// only ever talks to one host. That means no CORS, no mixed content, and wss://
// automatically whenever the page is served over https.
//
// Override with REACT_APP_API_HOST=<host>:<port> to talk to a backend somewhere
// else, e.g. local development against a backend started by hand:
//
//   REACT_APP_API_HOST=localhost:8080 npm start
//
const apiHost = process.env.REACT_APP_API_HOST || '';

const pageIsSecure =
  typeof window !== 'undefined' && window.location && window.location.protocol === 'https:';

const httpScheme = pageIsSecure ? 'https' : 'http';

// The websocket URL MUST use the ws:/wss: scheme. Passing an http: URL to the
// WebSocket constructor throws a SyntaxError on older mobile browsers (notably
// iOS Safari), which is why live updates never arrived on some phones.
const wsScheme = pageIsSecure ? 'wss' : 'ws';

const pageHost =
  typeof window !== 'undefined' && window.location ? window.location.host : '';

export const API_BASE = apiHost ? `${httpScheme}://${apiHost}` : '/api';
export const WS_URL = apiHost
  ? `${wsScheme}://${apiHost}/ws`
  : `${wsScheme}://${pageHost}/ws`;

// How often the clients ask the backend for fresh data. Polling is what keeps the
// leaderboard correct when the websocket is blocked or asleep (backgrounded tabs on
// mobile get their sockets suspended), so we poll even while connected, just slower.
export const POLL_INTERVAL_CONNECTED_MS = 8000;
export const POLL_INTERVAL_DISCONNECTED_MS = 2500;

const config = { API_BASE, WS_URL, POLL_INTERVAL_CONNECTED_MS, POLL_INTERVAL_DISCONNECTED_MS };

export default config;

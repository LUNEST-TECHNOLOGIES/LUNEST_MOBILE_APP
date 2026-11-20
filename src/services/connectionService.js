// A failed request can reveal an outage even while Wi-Fi still reports connected.
let state = { offline: false, degraded: false };
const listeners = new Set();
export function getConnectionState() { return state; }
export function subscribeConnection(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); }
function update(patch) {
  const next = {...state, ...patch};
  if (next.offline === state.offline && next.degraded === state.degraded) return;
  state = next;
  listeners.forEach(listener => listener(state));
}
export function reportNetworkFailure() { update({ degraded: true }); }
export function reportNetworkSuccess() { update({ offline: false, degraded: false }); }
export function setDeviceOffline(offline) { update({ offline, ...(offline ? {degraded:true} : {}) }); }
export function isDeviceOffline() { return state.offline || (typeof navigator !== 'undefined' && navigator.onLine === false); }

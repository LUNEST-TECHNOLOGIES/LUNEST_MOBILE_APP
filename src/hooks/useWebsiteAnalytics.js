import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import configService from '../services/configService';

const key = 'lunest.website.session.v1';
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
let memorySession;
function session() {
  let current = memorySession;
  try { current = JSON.parse(window.sessionStorage.getItem(key)) || current; } catch {}
  const fresh = !current?.id || Date.now() - current.lastSeen > 30 * 60000;
  if (fresh) current = { id: makeId() };
  current.lastSeen = Date.now();
  memorySession = current;
  try { window.sessionStorage.setItem(key, JSON.stringify(current)); } catch {}
  return { ...current, fresh };
}

export function useWebsiteAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let stopped = false;
    const send = async (type) => {
      if (document.visibilityState !== 'visible') return;
      const current = session();
      const payload = { sessionId: current.id, eventId: makeId(), type: current.fresh ? 'pageview' : type, path: pathname, referrer: document.referrer };
      try {
        const base = await configService.getBaseURL();
        if (stopped) return;
        await fetch(`${base.replace(/\/$/, '')}/v1/analytics/website/events`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      } catch { /* Analytics must never interrupt navigation or editing. */ }
    };
    // Scheduling avoids recording React Strict Mode's discarded effect.
    const initial = setTimeout(() => send('pageview'), 0);
    const timer = setInterval(() => send('heartbeat'), 60000);
    const visible = () => send('heartbeat');
    document.addEventListener('visibilitychange', visible);
    return () => { stopped = true; clearTimeout(initial); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [pathname]);
}

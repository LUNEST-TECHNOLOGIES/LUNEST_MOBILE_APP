import { bootLogo } from "../src/constants/bootLogo";
import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Custom Root HTML Template for Expo Router Web Export
 * Injects iOS & Android PWA Meta Tags, App Icons, Web Manifest, and Service Worker Registration with Instant Auto-Update.
 */
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />

        {/* PWA Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Primary Colors & Mobile Settings */}
        <meta name="theme-color" content="#010135" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="LUNEST" />

        {/* iOS Safari PWA Meta Tags (Crucial for iOS Add to Home Screen) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LUNEST" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Icons & Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* Disable body scrolling reset for React Native Web compatibility */}
        <ScrollViewStyleReset />

        {/* Register PWA Service Worker with Instant Auto-Update */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Global safety guard: silence non-fatal Service Worker / script load rejection errors
              window.addEventListener('unhandledrejection', function(event) {
                var reason = (event && event.reason) ? (event.reason.message || String(event.reason)) : '';
                if (reason.indexOf('sw.js') !== -1 || reason.indexOf('ServiceWorker') !== -1) {
                  event.preventDefault();
                  console.warn('🛡️ [LUNEST PWA] Suppressed non-critical worker/script load event:', reason);
                }
              });

              if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                window.addEventListener('load', function() {
                  try {
                    navigator.serviceWorker.register('/sw.js').then(function(registration) {
                      console.log('✅ [LUNEST PWA] ServiceWorker registered with scope:', registration.scope);
                      
                      // Trigger check for updates safely
                      if (registration && registration.update) {
                        registration.update().catch(function() {});
                      }

                      // Periodic check every 2 minutes safely
                      setInterval(function() {
                        try {
                          if (registration && registration.update) {
                            registration.update().catch(function() {});
                          }
                        } catch (_) {}
                      }, 120 * 1000);

                      // Listen for newly installing worker
                      registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              console.log('🔄 [LUNEST PWA] New update detected. Applying immediately...');
                              try {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                              } catch (_) {}
                            }
                          });
                        }
                      });
                    }).catch(function(err) {
                      console.warn('⚠️ [LUNEST PWA] ServiceWorker registration deferred:', err && err.message ? err.message : err);
                    });

                    // Keep the active input's keyboard/caret intact while an update arrives.
                    var refreshing = false;
                    var pendingReload = false;
                    function applyPendingUpdate() {
                      if (!pendingReload || refreshing) return;
                      var active = document.activeElement;
                      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
                      refreshing = true;
                      window.location.reload();
                    }
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      pendingReload = true;
                      applyPendingUpdate();
                    });
                    document.addEventListener('focusout', function() {
                      if (pendingReload) setTimeout(applyPendingUpdate, 1000);
                    });

                    // Check for updates when user returns to app safely
                    document.addEventListener('visibilitychange', function() {
                      if (document.visibilityState === 'visible') {
                        try {
                          navigator.serviceWorker.getRegistration().then(function(reg) {
                            if (reg && reg.update) {
                              reg.update().catch(function() {});
                            }
                          }).catch(function() {});
                        } catch (_) {}
                      }
                    });
                  } catch (e) {
                    console.warn('⚠️ [LUNEST PWA] Service worker init error:', e);
                  }
                });
              }
            `,
          }}
        />

        {/* Inline CSS styling fixes for PWA full-height viewport on mobile */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>
        <div id="lunest-web-boot" role="status" aria-live="polite">
          <div className="lunest-boot-logo"><img src={bootLogo} alt="LUNEST" width="220" height="48" /></div>
          <div className="lunest-boot-spinner" aria-hidden="true" />
          <p id="lunest-boot-message">Getting things ready…</p>
          <button id="lunest-boot-retry" type="button" hidden>Reload app</button>
        </div>
        {children}
        <script dangerouslySetInnerHTML={{ __html: bootRecovery }} />
      </body>
    </html>
  );
}

const responsiveBackground = `
#lunest-web-boot {
  position: fixed; inset: 0; z-index: 2147483000; display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: 24px;
  padding: 24px; box-sizing: border-box; color: #dce6ff;
  background: radial-gradient(ellipse at top, #123f83 0%, #010135 65%);
  font-family: system-ui, -apple-system, sans-serif; text-align: center;
}
.lunest-boot-logo { background: white; padding: 22px 24px; border-radius: 20px; max-width: 100%; box-sizing: border-box; }
.lunest-boot-logo img { display: block; width: 220px; max-width: 100%; height: auto; }
.lunest-boot-spinner { width: 32px; height: 32px; border: 3px solid #ffffff40; border-top-color: white; border-radius: 50%; animation: lunest-spin .8s linear infinite; }
#lunest-boot-message { font-size: 14px; line-height: 22px; max-width: 310px; margin: 0; }
#lunest-boot-retry { border: 0; border-radius: 24px; padding: 13px 28px; background: white; color: #010135; font-size: 14px; font-weight: 600; cursor: pointer; }
#lunest-boot-retry[hidden] { display: none; }
@keyframes lunest-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .lunest-boot-spinner { animation-duration: 2s; } }

html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #010135;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
}
`;

const bootRecovery = `
(function() {
  function showRecovery() {
    var message = document.getElementById('lunest-boot-message');
    var button = document.getElementById('lunest-boot-retry');
    if (message) message.textContent = 'Taking longer than usual. Check your connection or reload the app.';
    if (button) button.hidden = false;
  }
  setTimeout(showRecovery, 15000);
  window.addEventListener('error', function(event) {
    if (event.target && event.target.tagName === 'SCRIPT') showRecovery();
  }, true);
  var button = document.getElementById('lunest-boot-retry');
  if (button) button.addEventListener('click', async function() {
    button.disabled = true;
    try {
      if ('caches' in window) {
        var names = await caches.keys();
        await Promise.allSettled(names.filter(function(name) { return name.indexOf('lunest-pwa-') === 0; }).map(function(name) { return caches.delete(name); }));
      }
      if ('serviceWorker' in navigator) {
        var registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.filter(function(registration) { return registration.scope === location.origin + '/'; }).map(function(registration) { return registration.unregister(); }));
      }
    } finally { location.reload(); }
  });
})();
`;

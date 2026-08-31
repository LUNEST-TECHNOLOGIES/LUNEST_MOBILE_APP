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
                if (reason.indexOf('sw.js') !== -1 || reason.indexOf('ServiceWorker') !== -1 || reason.indexOf('Script load failed') !== -1) {
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

                    // Reload once when the new service worker takes control
                    var refreshing = false;
                    navigator.serviceWorker.addEventListener('controllerchange', function() {
                      if (!refreshing) {
                        refreshing = true;
                        console.log('🚀 [LUNEST PWA] Service worker updated. Reloading for latest version...');
                        window.location.reload();
                      }
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
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
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

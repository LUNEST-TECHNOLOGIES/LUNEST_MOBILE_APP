import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Custom Root HTML Template for Expo Router Web Export
 * Injects iOS & Android PWA Meta Tags, App Icons, Web Manifest, and Service Worker Registration.
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

        {/* Register PWA Service Worker script inline */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('✅ [LUNEST PWA] ServiceWorker registered with scope:', registration.scope);
                  }, function(err) {
                    console.log('⚠️ [LUNEST PWA] ServiceWorker registration failed:', err);
                  });
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

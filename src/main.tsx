import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Show crashes on screen instead of a blank white page (helps debugging on devices)
const showFatal = (msg: string) => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = '<pre style="padding:16px;white-space:pre-wrap;font-size:12px;color:#b91c1c">App error:\n' + msg.replace(/</g, '&lt;') + '</pre>';
  }
};
window.addEventListener('error', (e) => showFatal(String(e.message)));
window.addEventListener('unhandledrejection', (e) => showFatal(String(e.reason)));

// Service worker is for the web/PWA only; inside the Capacitor app it can serve stale assets
const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

// Enhanced PWA Service Worker Registration (Only in Production to prevent breaking Vite dev modules)
if ('serviceWorker' in navigator && !isNative) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully:', registration.scope);

          // Check for updates periodically (every hour)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version available! Refresh to update.');
                  if (confirm('May bagong update ang app! I-refresh para sa latest version?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New service worker activated');
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('[PWA] Update available');
      }
    });
  } else {
    // In development mode, auto-unregister any active service workers and clear caches
    // so Vite's TypeScript modules (.ts/.tsx) are never intercepted with text/html MIME type
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('[Dev] Unregistered stale service worker');
        });
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith('webnegosyo-')) {
            caches.delete(key);
          }
        }
      });
    }
  }
}

// PWA install prompt handling
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  console.log('[PWA] Install prompt available');
  
  // Optional: You can show a custom install button here
  // For example, dispatch a custom event or update a global state
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  deferredPrompt = null;
});

// Export function to trigger install prompt (can be used in components)
(window as any).showInstallPrompt = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    deferredPrompt = null;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/** PWA install helpers. The browser fires `beforeinstallprompt` once, early, so we keep it globally. */
let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        listeners.forEach((fn) => fn(e));
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        listeners.forEach((fn) => fn(null));
    });
}

export const getInstallPrompt = () => deferredPrompt;

export function onInstallPrompt(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/** Show the native Android / desktop install dialog. Returns true if the user installed. */
export async function promptInstall() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
}

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

export function platform() {
    const ua = navigator.userAgent;
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iphone|ipad|ipod/i.test(ua) || iPadOS) return 'ios';
    if (/android/i.test(ua)) return 'android';
    return 'desktop';
}

/**
 * Admin and staff install as two separate apps. Point the page at the right manifest after
 * in-app navigation too (e.g. "/" redirecting to "/admin"), not only on a full page load.
 */
export function syncManifest(path = window.location.pathname) {
    const isAdmin = path === '/admin' || path.startsWith('/admin/');
    const href = isAdmin ? '/manifest-admin.webmanifest' : '/manifest.webmanifest';
    const link = document.querySelector('link[rel="manifest"]');
    if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', isAdmin ? 'YH Admin' : 'Yours Home');
}

/** Open the install guide from anywhere (e.g. a button in Profile). */
export const openInstallGuide = () => window.dispatchEvent(new Event('hc:install-guide'));

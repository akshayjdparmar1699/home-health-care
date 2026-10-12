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

/** Open the install guide from anywhere (e.g. a button in Profile). */
export const openInstallGuide = () => window.dispatchEvent(new Event('hc:install-guide'));

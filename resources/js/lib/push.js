import api from './api';

/** Web Push (notifications while the app is closed). Needs HTTPS or localhost. */
export function pushSupport() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (!window.isSecureContext) return 'insecure';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.permission === 'granted' ? 'granted' : 'default';
}

function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribe() {
    if (!(await navigator.serviceWorker.getRegistration())) {
        await navigator.serviceWorker.register('/sw.js');
    }
    // Use the *active* registration: subscribing while the worker is still installing fails.
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
        const { data } = await api.get('/push/key');
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(data.key) });
    }
    await api.post('/push/subscribe', sub.toJSON());
    return true;
}

/** Ask permission (if needed) and register this device. Returns the final status. */
export async function enablePush() {
    const support = pushSupport();
    if (support === 'unsupported' || support === 'insecure' || support === 'denied') return support;
    const permission = support === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';
    await subscribe();
    return 'granted';
}

/** Keep this device registered for the logged-in user when permission was already given. */
export async function refreshPush() {
    if (pushSupport() !== 'granted') return;
    try {
        await subscribe();
    } catch (e) {
        console.warn('Push registration failed:', e?.name, e?.message); // retried on next app open
    }
}

export async function disablePush() {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
}

import { useEffect, useState } from 'react';

/**
 * Best GPS fix within `timeout` ms (stops early once accuracy <= `goodEnough` metres),
 * plus a best-effort street address from OpenStreetMap.
 * status: 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable' | 'insecure'
 */
export default function useLocation(active, { timeout = 15000, goodEnough = 30 } = {}) {
    const [state, setState] = useState({ status: 'idle', coords: null, address: '' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!active) return;
        if (!window.isSecureContext) return setState({ status: 'insecure', coords: null, address: '' });
        if (!navigator.geolocation) return setState({ status: 'unavailable', coords: null, address: '' });

        let best = null;
        let done = false;
        setState({ status: 'locating', coords: null, address: '' });

        const finish = () => {
            if (done) return;
            done = true;
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timer);
            if (!best) setState((s) => (s.status === 'denied' ? s : { status: 'unavailable', coords: null, address: '' }));
        };

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) };
                if (!best || c.accuracy < best.accuracy) {
                    best = c;
                    setState((s) => ({ ...s, status: 'ok', coords: c }));
                }
                if (c.accuracy <= goodEnough) finish();
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setState({ status: 'denied', coords: null, address: '' });
                    done = true;
                    navigator.geolocation.clearWatch(watchId);
                    clearTimeout(timer);
                }
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout },
        );
        const timer = setTimeout(finish, timeout);

        return () => {
            done = true;
            navigator.geolocation.clearWatch(watchId);
            clearTimeout(timer);
        };
    }, [active, attempt, timeout, goodEnough]);

    // Street address for the fix (OpenStreetMap Nominatim). Optional: coordinates are enough.
    const lat = state.coords?.lat;
    const lng = state.coords?.lng;
    useEffect(() => {
        if (lat === undefined) return;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}&accept-language=en`, { signal: ctrl.signal })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!d?.display_name) return;
                const short = d.display_name.split(',').slice(0, 5).join(',').trim();
                setState((s) => ({ ...s, address: short }));
            })
            .catch(() => {})
            .finally(() => clearTimeout(t));
        return () => ctrl.abort();
    }, [lat, lng]);

    return { ...state, retry: () => setAttempt((a) => a + 1) };
}

import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from './api';

/** Small GET helper: returns { data, loading, error, reload }. */
export default function useFetch(url, params = null, { interval } = {}) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const key = JSON.stringify(params);

    const load = useCallback(
        async (silent = false) => {
            if (!silent) setLoading(true);
            try {
                const res = await api.get(url, { params });
                setData(res.data);
                setError(null);
            } catch (e) {
                setError(errorMessage(e));
            } finally {
                setLoading(false);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [url, key],
    );

    useEffect(() => {
        load();
        // Refresh as soon as the internet comes back (PWA used offline).
        const onOnline = () => load(true);
        window.addEventListener('online', onOnline);
        const id = interval ? setInterval(() => load(true), interval) : null;
        return () => {
            window.removeEventListener('online', onOnline);
            if (id) clearInterval(id);
        };
    }, [load, interval]);

    return { data, loading, error, reload: load, setData };
}

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/** Thin bar at the top while the device has no internet. */
export default function OfflineBar() {
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const on = () => setOffline(false);
        const off = () => setOffline(true);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => {
            window.removeEventListener('online', on);
            window.removeEventListener('offline', off);
        };
    }, []);

    if (!offline) return null;
    return (
        <div className="safe-top fixed inset-x-0 top-0 z-[90] bg-slate-900 text-white">
            <p className="flex items-center justify-center gap-2 py-1.5 text-xs font-semibold">
                <WifiOff size={14} /> You are offline. Changes will work again when internet is back.
            </p>
        </div>
    );
}

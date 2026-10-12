import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import api from '../lib/api';

/** Image from a protected API route (Bearer token can't go in <img src>). */
export default function AuthImage({ src, alt, className = '', onClick }) {
    const [url, setUrl] = useState(null);
    const [state, setState] = useState('loading');

    useEffect(() => {
        let objectUrl;
        let cancelled = false;
        setState('loading');
        api.get(src, { responseType: 'blob' })
            .then((res) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(res.data);
                setUrl(objectUrl);
                setState('ok');
            })
            .catch(() => !cancelled && setState('error'));
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (state === 'loading')
        return (
            <div className={`flex items-center justify-center bg-slate-100 ${className}`}>
                <Loader2 className="animate-spin text-slate-400" size={20} />
            </div>
        );
    if (state === 'error')
        return (
            <div className={`flex flex-col items-center justify-center gap-1 bg-slate-100 text-xs text-slate-400 ${className}`}>
                <ImageOff size={20} /> Not available
            </div>
        );
    return <img src={url} alt={alt} className={`object-cover ${className}`} onClick={() => onClick?.(url)} />;
}

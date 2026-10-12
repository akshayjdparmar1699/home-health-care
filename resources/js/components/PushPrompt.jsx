import { useState } from 'react';
import { BellRing, Loader2 } from 'lucide-react';
import { enablePush, pushSupport } from '../lib/push';
import { useToast } from './ui';

/** Card asking the user to allow notifications (shown only until they are enabled). */
export default function PushPrompt({ title, text, className = '' }) {
    const toast = useToast();
    const [status, setStatus] = useState(pushSupport);
    const [busy, setBusy] = useState(false);

    if (status === 'granted' || status === 'unsupported') return null;

    const enable = async () => {
        setBusy(true);
        try {
            const result = await enablePush();
            setStatus(result);
            if (result === 'granted') toast('Notifications turned on');
        } catch {
            toast('Could not turn on notifications. Please try again.', 'error');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`flex items-center gap-3 rounded-2xl border border-accent-100 bg-accent-50/70 p-4 ${className}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm">
                <BellRing size={19} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">
                    {status === 'insecure'
                        ? 'Works on the secure (https) app.'
                        : status === 'denied'
                          ? 'Notifications are blocked. Allow them for this site in your browser settings.'
                          : text}
                </p>
            </div>
            {status === 'default' && (
                <button onClick={enable} disabled={busy} className="btn-primary shrink-0 px-3 py-2 text-xs">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : 'Turn on'}
                </button>
            )}
        </div>
    );
}

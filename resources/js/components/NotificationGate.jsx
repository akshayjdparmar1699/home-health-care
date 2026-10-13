import { useCallback, useEffect, useState } from 'react';
import { BellOff, BellRing, Download, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { enablePush, pushSupport, refreshPush } from '../lib/push';
import { isStandalone, openInstallGuide, platform } from '../lib/pwa';
import { useAuth } from '../lib/auth';

/**
 * Notifications are mandatory: duty reminders and payment / approval alerts depend on them.
 * Browsers only allow permission after a tap, so this screen blocks the app until it is given.
 * Devices that cannot receive web push at all (old browsers, local http) are let through.
 */
function gateState() {
    const support = pushSupport();
    if (support === 'unsupported') {
        // iPhone gets web push only from the installed (home screen) app.
        return platform() === 'ios' && !isStandalone() ? 'install' : 'ok';
    }
    if (support === 'insecure' || support === 'granted') return 'ok';
    return support; // 'default' | 'denied'
}

const BLOCKED_STEPS = {
    android: [
        'Long-press the app icon on your home screen and tap "App info" (ⓘ).',
        'Tap "Notifications" and turn them ON.',
        'Using Chrome instead? Tap the lock icon next to the website address → Permissions → Notifications → Allow.',
    ],
    ios: ['Open the iPhone Settings app.', 'Scroll down and tap the Yours Home (or YH Admin) app.', 'Tap "Notifications" and turn on "Allow Notifications".'],
    desktop: ['Click the lock icon next to the website address.', 'Set "Notifications" to Allow.', 'Come back to this tab.'],
};

export default function NotificationGate() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [state, setState] = useState(gateState);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const recheck = useCallback(() => {
        const next = gateState();
        setState(next);
        if (next === 'ok') refreshPush();
    }, []);

    // Pick up a change made in phone / browser settings as soon as the user comes back.
    useEffect(() => {
        let status;
        const onVisible = () => document.visibilityState === 'visible' && recheck();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', recheck);
        navigator.permissions
            ?.query({ name: 'notifications' })
            .then((s) => {
                status = s;
                s.onchange = recheck;
            })
            .catch(() => {});
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', recheck);
            if (status) status.onchange = null;
        };
    }, [recheck]);

    if (state === 'ok') return null;

    const allow = async () => {
        setBusy(true);
        setError('');
        try {
            const result = await enablePush();
            if (result !== 'granted') setError(result === 'denied' ? '' : 'Please tap "Allow" when your phone asks.');
            recheck();
        } catch {
            setError('Could not turn on notifications. Check your internet and try again.');
        } finally {
            setBusy(false);
        }
    };

    const signOut = async () => {
        await logout();
        navigate(window.location.pathname.startsWith('/admin') ? '/admin/login' : '/staff/login', { replace: true });
    };

    const os = platform();
    const blocked = state === 'denied';

    return (
        <div className="safe-top safe-bottom fixed inset-0 z-[78] flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="animate-slide-up w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-brand-gradient px-6 pb-6 pt-8 text-center text-white">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                        {blocked ? <BellOff size={30} /> : <BellRing size={30} />}
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold">{blocked ? 'Notifications are blocked' : 'Turn on notifications'}</h2>
                    <p className="mt-1 text-sm text-white/80">
                        {state === 'install'
                            ? 'On iPhone, notifications work only in the installed app.'
                            : 'Required to use the app: duty reminders, approvals and payment alerts.'}
                    </p>
                    <p lang="gu" className="mt-1 text-sm font-medium text-white/90">
                        {state === 'install' ? 'iPhone માં નોટિફિકેશન માટે પહેલા એપ ઇન્સ્ટોલ કરો.' : 'એપ વાપરવા માટે નોટિફિકેશન ચાલુ કરવું જરૂરી છે.'}
                    </p>
                </div>

                <div className="space-y-4 p-6">
                    {state === 'default' && (
                        <button onClick={allow} disabled={busy} className="btn-primary w-full py-3.5 text-base">
                            {busy ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />} Allow notifications
                        </button>
                    )}

                    {state === 'install' && (
                        <button onClick={openInstallGuide} className="btn-primary w-full py-3.5 text-base">
                            <Download size={18} /> Show me how to install
                        </button>
                    )}

                    {blocked && (
                        <>
                            <ol className="space-y-2.5">
                                {BLOCKED_STEPS[os].map((text, i) => (
                                    <li key={text} className="flex gap-3 text-sm text-slate-700">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-bold text-accent-600">
                                            {i + 1}
                                        </span>
                                        {text}
                                    </li>
                                ))}
                            </ol>
                            <button onClick={recheck} className="btn-primary w-full py-3.5 text-base">
                                <RefreshCw size={18} /> I have turned it on
                            </button>
                        </>
                    )}

                    {error && <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-800">{error}</p>}

                    <button onClick={signOut} className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-400">
                        <LogOut size={14} /> Log out
                    </button>
                </div>
            </div>
        </div>
    );
}

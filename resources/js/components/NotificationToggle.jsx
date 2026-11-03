import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { enablePush, pushSupport, pushTurnedOff, turnOffPush } from '../lib/push';
import { platform } from '../lib/pwa';
import { Modal, useToast } from './ui';

const BLOCKED_STEPS = {
    android: [
        'Long-press the app icon on your home screen and tap "App info" (ⓘ).',
        'Tap "Notifications" and turn them ON.',
        'Using Chrome instead? Tap the lock icon next to the website address → Permissions → Notifications → Allow.',
    ],
    ios: ['Open the iPhone Settings app.', 'Scroll down and tap the Yours Home (or YH Admin) app.', 'Tap "Notifications" and turn on "Allow Notifications".'],
    desktop: ['Click the lock icon next to the website address.', 'Set "Notifications" to Allow.', 'Come back to this tab.'],
};

/** 'on' | 'off' | 'blocked' (browser permission denied) | 'unsupported' */
function currentState() {
    const support = pushSupport();
    if (support === 'unsupported' || support === 'insecure') return 'unsupported';
    if (support === 'denied') return 'blocked';
    return support === 'granted' && !pushTurnedOff() ? 'on' : 'off';
}

/**
 * Notifications are optional: the user can switch them on or off any time.
 * Tapping while the browser has blocked them explains how to unblock in phone settings.
 */
export function usePushToggle() {
    const toast = useToast();
    const [state, setState] = useState(currentState);
    const [busy, setBusy] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    const recheck = useCallback(() => setState(currentState()), []);

    // Pick up a change made in phone / browser settings as soon as the user comes back.
    useEffect(() => {
        const onVisible = () => document.visibilityState === 'visible' && recheck();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', recheck);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', recheck);
        };
    }, [recheck]);

    const toggle = async () => {
        if (busy) return;
        if (state === 'blocked') {
            setHelpOpen(true);
            return;
        }
        setBusy(true);
        try {
            if (state === 'on') {
                await turnOffPush();
                toast('Notifications turned off');
            } else {
                const result = await enablePush();
                if (result === 'granted') toast('Notifications turned on');
                else if (result === 'denied') setHelpOpen(true);
                else toast('Please tap "Allow" when your phone asks.', 'error');
            }
        } catch {
            toast('Could not change notifications. Check your internet and try again.', 'error');
        } finally {
            setBusy(false);
            recheck();
        }
    };

    const helpModal = (
        <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Notifications are blocked" subtitle="Turn them on in your phone settings, then come back here." size="sm">
            <ol className="space-y-2.5 p-5">
                {BLOCKED_STEPS[platform()].map((text, i) => (
                    <li key={text} className="flex gap-3 text-sm text-slate-700">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-bold text-accent-600">{i + 1}</span>
                        {text}
                    </li>
                ))}
            </ol>
        </Modal>
    );

    return { state, busy, toggle, helpModal };
}

/** Round bell button for page headers: filled bell = on, crossed bell = off / blocked. */
export function NotificationToggleButton({ className = '' }) {
    const { state, busy, toggle, helpModal } = usePushToggle();
    if (state === 'unsupported') return null;
    const on = state === 'on';
    const Icon = busy ? Loader2 : on ? Bell : BellOff;

    return (
        <>
            <button
                onClick={toggle}
                title={on ? 'Notifications on (tap to turn off)' : 'Notifications off (tap to turn on)'}
                aria-label={on ? 'Turn notifications off' : 'Turn notifications on'}
                aria-pressed={on}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition ${
                    on ? 'border-slate-200 bg-white text-brand-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                } ${className}`}
            >
                <Icon size={19} className={busy ? 'animate-spin' : ''} />
                {!on && !busy && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
            </button>
            {helpModal}
        </>
    );
}

/** On / off switch row for the profile page. */
export function NotificationSetting() {
    const { state, busy, toggle, helpModal } = usePushToggle();
    if (state === 'unsupported') return null;
    const on = state === 'on';

    return (
        <div className="card p-5">
            <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {on ? <Bell size={18} className="text-brand-600" /> : <BellOff size={18} className="text-slate-400" />}
                        <h3 className="font-bold text-slate-900">Notifications</h3>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {state === 'blocked' ? 'Blocked in phone settings. Tap to see how to allow.' : 'Duty reminders, approvals and payment alerts'}
                    </p>
                </div>
                <button
                    role="switch"
                    aria-checked={on}
                    onClick={toggle}
                    disabled={busy}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand-600' : 'bg-slate-300'}`}
                >
                    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} />
                </button>
            </div>
            {helpModal}
        </div>
    );
}

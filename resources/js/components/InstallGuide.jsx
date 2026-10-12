import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    BookOpen,
    Bookmark,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Home,
    Lock,
    MoreVertical,
    RotateCw,
    Share,
    SquarePlus,
    Star,
    WifiOff,
    X,
    Zap,
} from 'lucide-react';
import { getInstallPrompt, isStandalone, onInstallPrompt, platform, promptInstall } from '../lib/pwa';
import { useAuth } from '../lib/auth';

const SNOOZE_DAYS = 3;
const keyFor = (user) => `hc_install_guide_${user?.id || 'guest'}`;

function snoozed(user) {
    try {
        const t = Number(localStorage.getItem(keyFor(user)) || 0);
        return Date.now() - t < SNOOZE_DAYS * 864e5;
    } catch {
        return false;
    }
}

function snooze(user) {
    try {
        localStorage.setItem(keyFor(user), String(Date.now()));
    } catch {
        // storage unavailable
    }
}

/* ---------------- Phone illustrations ---------------- */

function Phone({ children, dark = false }) {
    return (
        <div className={`relative mx-auto h-[300px] w-[170px] overflow-hidden rounded-[30px] border-[6px] border-slate-900 shadow-xl ${dark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="absolute left-1/2 top-1.5 z-20 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" />
            {children}
        </div>
    );
}

/** Pulsing highlight ring around the thing to tap. */
function Tap({ children, className = '' }) {
    return (
        <span className={`relative inline-flex items-center justify-center ${className}`}>
            <span className="absolute -inset-2 animate-ping rounded-full bg-accent-400/50" />
            <span className="absolute -inset-1.5 rounded-full ring-2 ring-accent-500" />
            <span className="relative">{children}</span>
        </span>
    );
}

function FakePage() {
    return (
        <div className="space-y-1.5 px-3 pt-9">
            <img src="/brand/logo.png" alt="" className="mb-2 h-6 w-auto" />
            <div className="h-14 rounded-lg bg-brand-gradient opacity-90" />
            <div className="h-2 w-3/4 rounded bg-slate-200" />
            <div className="h-2 w-1/2 rounded bg-slate-200" />
            <div className="h-8 rounded-lg bg-white shadow-sm" />
            <div className="h-8 rounded-lg bg-white shadow-sm" />
        </div>
    );
}

function IosShareStep() {
    return (
        <Phone>
            <FakePage />
            <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-3 pb-3 pt-2">
                <div className="mb-2 flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[9px] text-slate-500">
                    <Lock size={8} /> yourshome...
                </div>
                <div className="flex items-center justify-between text-sky-500">
                    <ChevronLeft size={16} />
                    <ChevronRight size={16} className="opacity-40" />
                    <Tap>
                        <Share size={16} />
                    </Tap>
                    <BookOpen size={15} />
                    <Copy size={15} />
                </div>
            </div>
        </Phone>
    );
}

function IosSheetStep() {
    const rows = [
        [Copy, 'Copy'],
        [BookOpen, 'Add to Reading List'],
        [Bookmark, 'Add Bookmark'],
        [Star, 'Add to Favourites'],
    ];
    return (
        <Phone>
            <div className="absolute inset-0 bg-slate-900/30" />
            <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-slate-100 p-2 pb-4">
                <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-slate-300" />
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-white p-2">
                    <img src="/icons/icon-192.png" alt="" className="h-6 w-6 rounded-md" />
                    <span className="text-[9px] font-semibold text-slate-700">Yours Home Healthcare</span>
                </div>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white text-[9px] text-slate-700">
                    {rows.map(([Icon, label]) => (
                        <div key={label} className="flex items-center justify-between px-2.5 py-1.5">
                            {label} <Icon size={10} className="text-slate-400" />
                        </div>
                    ))}
                    <div className="relative flex items-center justify-between bg-accent-50 px-2.5 py-2 font-bold text-slate-900 ring-2 ring-inset ring-accent-500">
                        Add to Home Screen <SquarePlus size={11} />
                        <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 animate-ping rounded-full bg-accent-400" />
                    </div>
                </div>
            </div>
        </Phone>
    );
}

function IosAddStep() {
    return (
        <Phone>
            <div className="bg-slate-100 px-2.5 pt-8">
                <div className="mb-3 flex items-center justify-between gap-1 text-[8px]">
                    <span className="shrink-0 text-sky-500">Cancel</span>
                    <span className="truncate font-bold text-slate-800">Add to Home</span>
                    <Tap className="mr-1 shrink-0">
                        <span className="font-bold text-sky-500">Add</span>
                    </Tap>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-2.5">
                    <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl shadow" />
                    <div className="min-w-0 flex-1">
                        <p className="border-b border-slate-200 pb-1 text-[10px] font-semibold text-slate-800">Yours Home</p>
                        <p className="truncate pt-1 text-[8px] text-slate-400">yourshomehealthcare</p>
                    </div>
                </div>
                <p className="mt-2 px-1 text-[8px] leading-snug text-slate-400">An icon will be added to your Home Screen so you can quickly access this website.</p>
            </div>
        </Phone>
    );
}

function HomeScreenStep() {
    const apps = ['bg-green-500', 'bg-sky-500', 'bg-amber-400', 'bg-rose-500', 'bg-violet-500', 'bg-slate-400', 'bg-emerald-500'];
    return (
        <Phone dark>
            <div className="absolute inset-0 bg-gradient-to-b from-brand-800 via-[#5b3168] to-accent-600" />
            <div className="relative grid grid-cols-4 gap-x-2 gap-y-3 px-3 pt-10">
                {apps.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`h-8 w-8 rounded-[9px] ${c} opacity-80`} />
                        <div className="h-1 w-6 rounded bg-white/40" />
                    </div>
                ))}
                <div className="flex flex-col items-center gap-1">
                    <Tap className="rounded-[9px]">
                        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-[9px] bg-white" />
                    </Tap>
                    <span className="mt-0.5 text-[7px] font-semibold text-white">Yours Home</span>
                </div>
            </div>
        </Phone>
    );
}

function AndroidMenuStep() {
    return (
        <Phone>
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 bg-white px-2 pb-1.5 pt-6 shadow-sm">
                <Home size={11} className="text-slate-500" />
                <div className="flex flex-1 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[8px] text-slate-500">
                    <Lock size={7} /> yourshome...
                </div>
                <Tap>
                    <MoreVertical size={13} className="text-slate-700" />
                </Tap>
            </div>
            <div className="pt-6">
                <FakePage />
            </div>
        </Phone>
    );
}

function AndroidListStep() {
    const rows = [
        [ArrowRight, 'New tab'],
        [Bookmark, 'Bookmarks'],
        [RotateCw, 'History'],
        [Share, 'Share...'],
    ];
    return (
        <Phone>
            <FakePage />
            <div className="absolute right-1.5 top-6 z-10 w-[118px] overflow-hidden rounded-lg bg-white py-1 text-[8.5px] text-slate-700 shadow-2xl ring-1 ring-slate-200">
                {rows.map(([Icon, label]) => (
                    <div key={label} className="flex items-center gap-2 px-2.5 py-1.5">
                        <Icon size={9} className="text-slate-400" /> {label}
                    </div>
                ))}
                <div className="flex items-center gap-2 bg-accent-50 px-2.5 py-2 font-bold text-slate-900 ring-2 ring-inset ring-accent-500">
                    <Download size={9} /> Install app
                </div>
                <div className="px-2.5 pb-1 pt-0.5 text-[7px] text-slate-400">or "Add to Home screen"</div>
            </div>
        </Phone>
    );
}

function AndroidConfirmStep() {
    return (
        <Phone>
            <FakePage />
            <div className="absolute inset-0 bg-slate-900/40" />
            <div className="absolute inset-x-3 top-1/3 rounded-2xl bg-white p-3 shadow-2xl">
                <p className="text-[10px] font-bold text-slate-900">Install app?</p>
                <div className="mt-2 flex items-center gap-2">
                    <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg shadow" />
                    <div>
                        <p className="text-[9px] font-semibold text-slate-800">Yours Home Healthcare</p>
                        <p className="text-[7px] text-slate-400">yourshomehealthcare</p>
                    </div>
                </div>
                <div className="mt-3 flex justify-end gap-3 text-[9px] font-bold">
                    <span className="text-slate-400">Cancel</span>
                    <Tap>
                        <span className="text-brand-600">Install</span>
                    </Tap>
                </div>
            </div>
        </Phone>
    );
}

const IOS_STEPS = [
    { art: IosShareStep, title: 'Tap the Share button', text: 'In Safari, tap the Share icon (square with an arrow) at the bottom of the screen.', gu: 'નીચે આપેલ Share બટન દબાવો.' },
    { art: IosSheetStep, title: 'Tap "Add to Home Screen"', text: 'Scroll down the list a little and tap "Add to Home Screen".', gu: 'લિસ્ટમાં નીચે જઈ "Add to Home Screen" દબાવો.' },
    { art: IosAddStep, title: 'Tap "Add"', text: 'Tap "Add" at the top right corner.', gu: 'ઉપર જમણી બાજુ "Add" દબાવો.' },
    { art: HomeScreenStep, title: 'Done! Open it from your Home Screen', text: 'The Yours Home app icon is now on your Home Screen. Always open the app from there.', gu: 'હવે Home Screen પરથી એપ ખોલો.' },
];

const ANDROID_STEPS = [
    { art: AndroidMenuStep, title: 'Tap the menu (⋮)', text: 'In Chrome, tap the three dots at the top right corner.', gu: 'ઉપર જમણી બાજુ ત્રણ ટપકાં (⋮) દબાવો.' },
    { art: AndroidListStep, title: 'Tap "Install app"', text: 'Tap "Install app" or "Add to Home screen".', gu: '"Install app" અથવા "Add to Home screen" દબાવો.' },
    { art: AndroidConfirmStep, title: 'Tap "Install"', text: 'Confirm by tapping "Install".', gu: '"Install" દબાવો.' },
    { art: HomeScreenStep, title: 'Done! Open it from your Home Screen', text: 'The Yours Home app icon is now on your Home Screen. Always open the app from there.', gu: 'હવે Home Screen પરથી એપ ખોલો.' },
];

/* ---------------- Guide ---------------- */

/**
 * Install the web app. Android/desktop Chrome: one-tap native install. iPhone (or when the native
 * prompt isn't available): a step-by-step tour. `auto` opens it once after login (snoozed for 3 days).
 */
export default function InstallGuide({ auto = false }) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(-1); // -1 = intro screen
    const [canPrompt, setCanPrompt] = useState(!!getInstallPrompt());
    const os = platform();

    useEffect(() => onInstallPrompt((e) => setCanPrompt(!!e)), []);

    // Auto-open shortly after login on phones (and on desktop Chrome when installable).
    useEffect(() => {
        if (!auto || isStandalone() || snoozed(user)) return;
        const t = setTimeout(() => {
            if (os === 'desktop' && !getInstallPrompt()) return;
            setStep(-1);
            setOpen(true);
        }, 1800);
        return () => clearTimeout(t);
    }, [auto, user, os]);

    // Manual open from anywhere (Profile / Settings button).
    useEffect(() => {
        const handler = () => {
            setStep(-1);
            setOpen(true);
        };
        window.addEventListener('hc:install-guide', handler);
        return () => window.removeEventListener('hc:install-guide', handler);
    }, []);

    if (!open) return null;

    const steps = os === 'ios' ? IOS_STEPS : ANDROID_STEPS;
    const close = () => {
        snooze(user);
        setOpen(false);
    };

    const install = async () => {
        if (canPrompt) {
            const ok = await promptInstall();
            if (ok) {
                snooze(user);
                setOpen(false);
                return;
            }
            setCanPrompt(!!getInstallPrompt());
            return;
        }
        setStep(0);
    };

    const current = step >= 0 ? steps[step] : null;
    const Art = current?.art;

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={close} />
            <div className="animate-slide-up safe-bottom relative w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
                <button onClick={close} className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 text-slate-500 hover:bg-white" aria-label="Close">
                    <X size={18} />
                </button>

                {step < 0 ? (
                    <>
                        <div className="bg-brand-gradient relative overflow-hidden px-6 pb-6 pt-8 text-center text-white">
                            <img src="/brand/emblem-white.png" alt="" className="pointer-events-none absolute -right-8 -top-6 w-40 opacity-10" />
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-2 shadow-xl">
                                <img src="/brand/emblem.png" alt="" className="h-full w-full object-contain" />
                            </div>
                            <h2 className="mt-4 text-xl font-extrabold">Install the Yours Home app</h2>
                            <p className="mt-1 text-sm text-white/80">Add it to your home screen and open it like any other app.</p>
                        </div>
                        <div className="space-y-3 p-6">
                            {[
                                [Zap, 'Opens instantly, full screen'],
                                [Bell, 'One tap to start and end duty'],
                                [WifiOff, 'Works even on a weak network'],
                            ].map(([Icon, text]) => (
                                <div key={text} className="flex items-center gap-3 text-sm text-slate-700">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                                        <Icon size={17} />
                                    </span>
                                    {text}
                                </div>
                            ))}
                            <button onClick={install} className="btn-primary mt-3 w-full py-3.5 text-base">
                                {canPrompt ? (
                                    <>
                                        <Download size={18} /> Install app
                                    </>
                                ) : (
                                    <>
                                        Show me how <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                            <button onClick={close} className="w-full py-2 text-sm font-semibold text-slate-400">
                                Maybe later
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="px-6 pb-6 pt-7">
                        <div className="mb-4 flex justify-center gap-1.5">
                            {steps.map((_, i) => (
                                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent-500' : i < step ? 'w-1.5 bg-brand-600' : 'w-1.5 bg-slate-200'}`} />
                            ))}
                        </div>
                        <div key={step} className="page-in">
                            <Art />
                            <p className="mt-5 text-center text-xs font-bold uppercase tracking-wider text-accent-500">
                                Step {step + 1} of {steps.length}
                            </p>
                            <h3 className="mt-1 text-center text-lg font-extrabold text-slate-900">{current.title}</h3>
                            <p className="mt-1 text-center text-sm text-slate-500">{current.text}</p>
                            <p lang="gu" className="mt-1 text-center text-sm font-medium text-brand-700">
                                {current.gu}
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button className="btn-secondary px-4 py-3" onClick={() => setStep(step - 1)}>
                                <ArrowLeft size={18} />
                            </button>
                            {step < steps.length - 1 ? (
                                <button className="btn-primary flex-1 py-3 text-base" onClick={() => setStep(step + 1)}>
                                    Next <ArrowRight size={18} />
                                </button>
                            ) : (
                                <button className="btn-primary flex-1 py-3 text-base" onClick={close}>
                                    <Check size={18} /> Got it
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

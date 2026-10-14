import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { compressImage } from '../lib/staffForm';
import { isStandalone, platform } from '../lib/pwa';

/** WhatsApp, Facebook, Instagram etc. open links in their own browser, where the camera often does not work. */
const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)|WhatsApp/i.test(navigator.userAgent);

const canUseLiveCamera = () => !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

/** 'granted' | 'prompt' | 'denied' | 'unknown' (browsers without the Permissions API for camera). */
async function cameraPermission() {
    try {
        return (await navigator.permissions.query({ name: 'camera' })).state;
    } catch {
        return 'unknown';
    }
}

/**
 * Once camera access is blocked the browser never asks again, so a website cannot re-request it.
 * Show the exact steps for this phone to unblock it in settings.
 */
function unblockSteps() {
    const os = platform();
    if (os === 'ios') {
        return isStandalone()
            ? ['Open the iPhone Settings app.', 'Scroll down and tap Safari → Camera.', 'Choose "Allow" (or "Ask"), then come back to the app.']
            : ['Tap "aA" in the Safari address bar → Website Settings.', 'Set Camera to "Allow".', 'Come back to this page.'];
    }
    if (os === 'android') {
        return isStandalone()
            ? ['Long-press the Yours Home app icon on your home screen → App info (ⓘ).', 'Tap Permissions → Camera → Allow.', 'Come back to the app: the camera opens by itself.']
            : ['Tap the lock icon next to the website address at the top.', 'Tap Permissions → Camera → Allow (or "Reset permissions").', 'Still blocked? Phone Settings → Apps → Chrome → Permissions → Camera → Allow.'];
    }
    return ['Click the lock icon next to the website address.', 'Set Camera to "Allow".', 'Come back to this tab.'];
}

/** Plain-language reason and fix for a camera error other than "blocked". */
function cameraProblem(err) {
    const name = err?.name || '';
    if (!window.isSecureContext) return 'The camera works only on the secure (https) app link.';
    if (inAppBrowser()) return 'This link is open inside WhatsApp / another app, which blocks the camera. Tap ⋮ (top right) → "Open in Chrome", then try again.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app (video call, camera app). Close that app and try again.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No front camera was found on this device.';
    return 'The camera could not be started. Please try again.';
}

async function openFrontCamera() {
    try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    } catch (e) {
        // Some phones reject the size / facing hints: retry with any camera.
        if (e.name === 'OverconstrainedError' || e.name === 'NotFoundError' || e.name === 'NotReadableError') {
            return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        throw e;
    }
}

/**
 * In-app live camera (front camera on phones, webcam on computers). Taking the photo inside the
 * app avoids the phone's camera app, which on low-memory phones reloads the page and loses the photo.
 *
 * phase: 'checking' | 'ask' (explain before the browser's permission popup) | 'live' | 'blocked' | 'error'
 */
function CameraScreen({ open, onClose, onCapture, onUseCameraApp }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [phase, setPhase] = useState('checking');
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    }, []);

    const start = useCallback(async () => {
        if (!canUseLiveCamera()) {
            setError(cameraProblem({ name: 'NotSupportedError' }));
            return setPhase('error');
        }
        setReady(false);
        setPhase('live');
        try {
            const stream = await openFrontCamera();
            stop();
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
        } catch (e) {
            if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
                if (inAppBrowser()) {
                    setError(cameraProblem(e));
                    return setPhase('error');
                }
                return setPhase('blocked');
            }
            setError(cameraProblem(e));
            setPhase('error');
        }
    }, [stop]);

    // Decide what to show first: straight to the camera, an explanation, or the unblock steps.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setPhase('checking');
        cameraPermission().then((state) => {
            if (cancelled) return;
            if (state === 'denied') setPhase('blocked');
            else if (state === 'prompt') setPhase('ask');
            else start();
        });
        return () => {
            cancelled = true;
            stop();
        };
    }, [open, start, stop]);

    // While blocked, open the camera by itself as soon as it is allowed in settings.
    useEffect(() => {
        if (!open || phase !== 'blocked') return;
        let status;
        const recheck = async () => {
            if ((await cameraPermission()) !== 'denied') start();
        };
        const onVisible = () => document.visibilityState === 'visible' && recheck();
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', recheck);
        navigator.permissions
            ?.query({ name: 'camera' })
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
    }, [open, phase, start]);

    if (!open) return null;

    const snap = () => {
        const v = videoRef.current;
        if (!v?.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0);
        canvas.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.88);
    };

    const panel = (children) => <div className="mx-5 max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-slate-800">{children}</div>;

    return createPortal(
        <div className="safe-top safe-bottom fixed inset-0 z-[85] flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-4 py-3">
                <p className="font-semibold">Take a selfie</p>
                <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close camera">
                    <X size={20} />
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden py-4">
                {phase === 'checking' && <Loader2 size={32} className="animate-spin text-white/70" />}

                {phase === 'ask' &&
                    panel(
                        <>
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                                <Camera size={24} />
                            </span>
                            <p className="mt-3 text-lg font-bold">Allow the camera</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Your phone will now ask to use the camera. Tap <b>Allow</b> so you can take your duty selfie.
                            </p>
                            <p lang="gu" className="mt-1 text-sm font-medium text-brand-700">
                                હવે ફોન કેમેરા માટે પૂછશે, ત્યારે <b>Allow</b> દબાવો.
                            </p>
                            <button type="button" className="btn-primary mt-4 w-full py-3" onClick={start}>
                                <Camera size={16} /> Open camera
                            </button>
                        </>,
                    )}

                {phase === 'blocked' &&
                    panel(
                        <>
                            <p className="flex items-center gap-2 font-bold text-rose-600">
                                <CameraOff size={18} /> Camera is blocked for this app
                            </p>
                            <p className="mt-1 text-sm text-slate-600">The phone will not ask again by itself. Turn it on once in settings:</p>
                            <p lang="gu" className="mt-1 text-sm font-medium text-brand-700">
                                કેમેરા બ્લોક છે. નીચેના સ્ટેપ્સથી Allow કરો.
                            </p>
                            <ol className="mt-3 space-y-2">
                                {unblockSteps().map((text, i) => (
                                    <li key={text} className="flex gap-2.5 text-sm text-slate-700">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-bold text-accent-600">
                                            {i + 1}
                                        </span>
                                        {text}
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-4 grid gap-2">
                                <button type="button" className="btn-primary py-3" onClick={onUseCameraApp}>
                                    <Camera size={16} /> Take selfie with phone camera
                                </button>
                                <button type="button" className="btn-secondary py-3" onClick={start}>
                                    <RefreshCw size={16} /> I have allowed it, try again
                                </button>
                            </div>
                        </>,
                    )}

                {phase === 'error' &&
                    panel(
                        <>
                            <p className="flex items-center gap-2 font-bold text-rose-600">
                                <CameraOff size={18} /> Camera did not open
                            </p>
                            <p className="mt-2 text-sm text-slate-600">{error}</p>
                            <div className="mt-4 grid gap-2">
                                <button type="button" className="btn-primary py-3" onClick={start}>
                                    <RefreshCw size={16} /> Try again
                                </button>
                                <button type="button" className="btn-secondary py-3" onClick={onUseCameraApp}>
                                    <Camera size={16} /> Use phone camera app
                                </button>
                            </div>
                        </>,
                    )}

                {phase === 'live' && (
                    <>
                        <video
                            ref={(el) => {
                                videoRef.current = el;
                                // The stream may arrive before or after this element mounts.
                                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                                    el.srcObject = streamRef.current;
                                    el.play().catch(() => {});
                                }
                            }}
                            autoPlay
                            playsInline
                            muted
                            onLoadedData={() => setReady(true)}
                            className="h-full w-full -scale-x-100 object-cover"
                        />
                        {!ready && <Loader2 size={32} className="absolute animate-spin text-white/70" />}
                        <div className="pointer-events-none absolute inset-x-10 top-1/2 aspect-[3/4] max-h-[70%] -translate-y-1/2 rounded-[45%] border-2 border-white/40" />
                    </>
                )}
            </div>

            {phase === 'live' && (
                <div className="flex flex-col items-center gap-2 py-6">
                    <button
                        type="button"
                        onClick={snap}
                        disabled={!ready}
                        aria-label="Take photo"
                        className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white/80 disabled:opacity-40"
                    >
                        <span className="h-[58px] w-[58px] rounded-full bg-white active:scale-95" />
                    </button>
                    <p className="text-xs text-white/60">Keep your face inside the oval, in good light</p>
                </div>
            )}
        </div>,
        document.body,
    );
}

/**
 * Pick or capture a photo. `value` is a Blob, `existing` an element to show when nothing new is chosen.
 * `selfie` opens the in-app live camera (front camera on phones, webcam on computers); the phone's
 * camera app is only a fallback when the live camera cannot start.
 */
export default function PhotoPicker({ label, hint, value, onChange, error, selfie = false, existing, aspect = 'aspect-[4/3]', fit = 'cover' }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [camera, setCamera] = useState(false);
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!value) return setPreview(null);
        const url = URL.createObjectURL(value);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [value]);

    const handle = async (fileOrBlob) => {
        setLocalError('');
        setBusy(true);
        try {
            onChange(await compressImage(fileOrBlob));
        } catch (e) {
            setLocalError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const open = () => {
        if (selfie) setCamera(true);
        else inputRef.current?.click();
    };

    const shown = preview || existing;

    return (
        <div>
            {label && <p className="label">{label}</p>}
            <div
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed ${
                    error || localError ? 'border-rose-300 bg-rose-50/40' : shown ? 'border-transparent' : 'border-slate-200 bg-slate-50'
                } ${aspect}`}
            >
                {shown ? (
                    <>
                        {preview ? <img src={preview} alt={label} className={`h-full w-full ${fit === 'contain' ? 'bg-slate-900 object-contain' : 'object-cover'}`} /> : <div className="h-full w-full">{existing}</div>}
                        <div className={`absolute inset-x-0 flex justify-end gap-2 p-2 ${fit === 'contain' ? 'top-0 bg-gradient-to-b from-black/50 to-transparent' : 'bottom-0 bg-gradient-to-t from-black/60 to-transparent'}`}>
                            <button type="button" onClick={open} className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800">
                                <RefreshCw size={13} /> {selfie ? 'Retake' : 'Change'}
                            </button>
                            {preview && (
                                <button type="button" onClick={() => onChange(null)} className="rounded-lg bg-white/95 p-1.5 text-rose-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <button type="button" onClick={open} className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
                        {busy ? (
                            <Loader2 className="animate-spin text-brand-600" />
                        ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                                {selfie ? <Camera size={22} /> : <ImagePlus size={22} />}
                            </span>
                        )}
                        <span className="text-sm font-semibold text-slate-700">{selfie ? 'Take selfie' : 'Upload photo'}</span>
                        {hint && <span className="text-xs text-slate-400">{hint}</span>}
                    </button>
                )}
            </div>
            {(error || localError) && <p className="mt-1 text-xs font-medium text-rose-600">{error || localError}</p>}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture={selfie ? 'user' : undefined}
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handle(f);
                }}
            />
            {selfie && (
                <CameraScreen
                    open={camera}
                    onClose={() => setCamera(false)}
                    onCapture={(b) => {
                        setCamera(false);
                        handle(b);
                    }}
                    onUseCameraApp={() => {
                        setCamera(false);
                        inputRef.current?.click();
                    }}
                />
            )}
        </div>
    );
}

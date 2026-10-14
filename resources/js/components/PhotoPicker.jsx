import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CameraOff, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { compressImage } from '../lib/staffForm';

/** WhatsApp, Facebook, Instagram etc. open links in their own browser, where the camera often does not work. */
const inAppBrowser = () => /FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)|WhatsApp/i.test(navigator.userAgent);

const canUseLiveCamera = () => !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

/** Plain-language reason and fix for a camera error, so staff can solve it themselves. */
function cameraProblem(err) {
    const name = err?.name || '';
    if (!window.isSecureContext) return 'The camera works only on the secure (https) app link.';
    if (inAppBrowser()) return 'This link is open inside WhatsApp / another app, which blocks the camera. Tap ⋮ (top right) → "Open in Chrome", then try again.';
    if (name === 'NotAllowedError' || name === 'SecurityError')
        return 'Camera permission is blocked. Tap the lock icon next to the website address → Permissions → Camera → Allow. If it is already allowed, open phone Settings → Apps → Chrome → Permissions → Camera → Allow.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'The camera is busy in another app (video call, camera app). Close that app and try again.';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No front camera was found on this device.';
    return 'The camera could not be started. Please try again.';
}

/**
 * In-app live camera (front camera on phones, webcam on computers). Taking the photo inside the
 * app avoids the phone's camera app, which on low-memory phones reloads the page and loses the photo.
 */
function CameraScreen({ open, onClose, onCapture, onUseCameraApp }) {
    const videoRef = useRef(null);
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!open) return;
        let stream;
        let cancelled = false;
        setError('');
        setReady(false);

        const start = async () => {
            if (!canUseLiveCamera()) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
            try {
                return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
            } catch (e) {
                // Some phones reject the size / facing hints: retry with any camera.
                if (e.name === 'OverconstrainedError' || e.name === 'NotFoundError' || e.name === 'NotReadableError') {
                    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                throw e;
            }
        };

        start()
            .then((s) => {
                stream = s;
                if (cancelled) return s.getTracks().forEach((t) => t.stop());
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play().catch(() => {});
                }
            })
            .catch((e) => !cancelled && setError(cameraProblem(e)));

        return () => {
            cancelled = true;
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [open, attempt]);

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

    return createPortal(
        <div className="safe-top safe-bottom fixed inset-0 z-[85] flex flex-col bg-black text-white">
            <div className="flex items-center justify-between px-4 py-3">
                <p className="font-semibold">Take a selfie</p>
                <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close camera">
                    <X size={20} />
                </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                {error ? (
                    <div className="mx-5 max-w-sm rounded-2xl bg-white p-5 text-slate-800">
                        <p className="flex items-center gap-2 font-bold text-rose-600">
                            <CameraOff size={18} /> Camera did not open
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{error}</p>
                        <div className="mt-4 grid gap-2">
                            <button type="button" className="btn-primary py-3" onClick={() => setAttempt((a) => a + 1)}>
                                <RefreshCw size={16} /> Try again
                            </button>
                            <button type="button" className="btn-secondary py-3" onClick={onUseCameraApp}>
                                <Camera size={16} /> Use phone camera app
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
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

            {!error && (
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

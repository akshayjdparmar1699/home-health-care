import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { compressImage } from '../lib/staffForm';
import { Modal } from './ui';

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** Live webcam capture for desktops (needs HTTPS or localhost). */
function WebcamModal({ open, onClose, onCapture }) {
    const videoRef = useRef(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        let stream;
        setError('');
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: 'user', width: 1280, height: 960 } })
            .then((s) => {
                stream = s;
                if (videoRef.current) videoRef.current.srcObject = s;
            })
            .catch(() => setError('Camera not available. Please allow camera access or upload a photo instead.'));
        return () => stream?.getTracks().forEach((t) => t.stop());
    }, [open]);

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
        canvas.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.85);
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Take a selfie"
            subtitle="Face the camera in good light"
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={snap} disabled={!!error}>
                        <Camera size={16} /> Capture
                    </button>
                </>
            }
        >
            {error ? (
                <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{error}</p>
            ) : (
                <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full -scale-x-100 rounded-2xl bg-slate-900 object-cover" />
            )}
        </Modal>
    );
}

/**
 * Pick or capture a photo. `value` is a Blob, `existing` an element to show when nothing new is chosen.
 * `selfie` opens the front camera on phones and a webcam on desktops.
 */
export default function PhotoPicker({ label, hint, value, onChange, error, selfie = false, existing, aspect = 'aspect-[4/3]', fit = 'cover' }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [webcam, setWebcam] = useState(false);
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
        const canWebcam = selfie && !isTouch() && navigator.mediaDevices?.getUserMedia && window.isSecureContext;
        if (canWebcam) setWebcam(true);
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
            <WebcamModal
                open={webcam}
                onClose={() => setWebcam(false)}
                onCapture={(b) => {
                    setWebcam(false);
                    handle(b);
                }}
            />
        </div>
    );
}

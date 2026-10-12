import { useEffect, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Loader2, MapPin, Play, RotateCw } from 'lucide-react';
import { useAuth } from '../lib/auth';
import useLocation from '../lib/useLocation';
import { stampImage } from '../lib/stamp';
import PhotoPicker from '../components/PhotoPicker';
import { Modal } from '../components/ui';

const LOCATION_HELP = {
    denied: 'Location permission is blocked. Allow location for this site in your browser settings, then tap Retry.',
    unavailable: 'Could not get your location. Turn on GPS / Location and tap Retry.',
    insecure: 'Location works only on the secure (https) app. Your selfie will still be saved.',
};

/**
 * Duty check-in: live selfie stamped with GPS location, address, time, staff and client.
 * onSubmit({ selfie, lat, lng, accuracy, address }) must return a promise.
 */
export default function DutyCheckIn({ open, onClose, client, onSubmit }) {
    const { user } = useAuth();
    const loc = useLocation(open);
    const [raw, setRaw] = useState(null);
    const [stamped, setStamped] = useState(null);
    const [noLocationOk, setNoLocationOk] = useState(false);
    const [busy, setBusy] = useState(false);
    const [takenAt, setTakenAt] = useState(null);

    useEffect(() => {
        if (open) {
            setRaw(null);
            setStamped(null);
            setNoLocationOk(false);
            setTakenAt(null);
        }
    }, [open]);

    // (Re)draw the stamp whenever the photo, the GPS fix or the address changes.
    useEffect(() => {
        if (!raw) return setStamped(null);
        let cancelled = false;
        const when = (takenAt || new Date()).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        const c = loc.coords;
        const lines = [
            loc.address || (c ? 'Address not found' : 'Location not available'),
            c ? `Lat ${c.lat.toFixed(6)}, Long ${c.lng.toFixed(6)}  (±${c.accuracy} m)` : 'GPS: not available',
            `${when}  ·  ${client ? `Client: ${client.name}` : 'Duty check-in'}`,
        ];
        stampImage(raw, { title: `${user?.name || 'Staff'} · Duty start`, lines })
            .then((b) => !cancelled && setStamped(b))
            .catch(() => !cancelled && setStamped(raw));
        return () => {
            cancelled = true;
        };
    }, [raw, loc.coords, loc.address, client, user, takenAt]);

    const located = loc.status === 'ok' && !!loc.coords;
    const locationProblem = ['denied', 'unavailable', 'insecure'].includes(loc.status);
    const canStart = !!stamped && (located || (locationProblem && noLocationOk));

    const submit = async () => {
        setBusy(true);
        try {
            await onSubmit({
                selfie: stamped,
                lat: loc.coords?.lat,
                lng: loc.coords?.lng,
                accuracy: loc.coords?.accuracy,
                address: loc.address || null,
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={busy ? () => {} : onClose}
            title="Duty check-in"
            subtitle={client ? `Starting duty at ${client.name}` : 'Take a selfie to start your duty'}
            footer={
                <button className="btn-primary w-full py-3.5 text-base" onClick={submit} disabled={!canStart || busy}>
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                    {busy ? 'Starting...' : 'Start Duty'}
                </button>
            }
        >
            <div className="space-y-4">
                {/* Location status */}
                <div
                    className={`flex items-start gap-3 rounded-2xl p-3 text-sm ${
                        located ? 'bg-emerald-50 text-emerald-800' : locationProblem ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'
                    }`}
                >
                    {loc.status === 'locating' || loc.status === 'idle' ? (
                        <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" />
                    ) : located ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                    ) : (
                        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                        {located ? (
                            <>
                                <p className="font-semibold">Location found (±{loc.coords.accuracy} m)</p>
                                <p className="truncate text-xs opacity-80">{loc.address || `${loc.coords.lat.toFixed(5)}, ${loc.coords.lng.toFixed(5)}`}</p>
                            </>
                        ) : locationProblem ? (
                            <>
                                <p className="font-semibold">Location not available</p>
                                <p className="text-xs">{LOCATION_HELP[loc.status]}</p>
                            </>
                        ) : (
                            <p className="font-semibold">Getting your location...</p>
                        )}
                    </div>
                    {(locationProblem || (located && loc.coords.accuracy > 100)) && loc.status !== 'insecure' && (
                        <button onClick={loc.retry} className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm">
                            <RotateCw size={13} /> Retry
                        </button>
                    )}
                </div>

                {/* Selfie */}
                <div className="mx-auto max-w-[260px]">
                    <PhotoPicker
                        selfie
                        aspect="aspect-[3/4]"
                        fit="contain"
                        value={stamped}
                        onChange={(b) => {
                            setRaw(b);
                            setTakenAt(b ? new Date() : null);
                        }}
                        hint="Your face must be clearly visible"
                    />
                </div>
                {!raw && (
                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                        <Camera size={13} /> The selfie is saved with your location and time.
                    </p>
                )}

                {locationProblem && stamped && (
                    <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-900">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={noLocationOk} onChange={(e) => setNoLocationOk(e.target.checked)} />
                        <span>Start duty without location. The admin will see that location was not shared.</span>
                    </label>
                )}

                {located && stamped && (
                    <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700">
                        <MapPin size={13} /> Ready. Tap Start Duty.
                    </p>
                )}
            </div>
        </Modal>
    );
}

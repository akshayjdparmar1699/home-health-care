import { useState } from 'react';
import { ExternalLink, Loader2, LocateFixed, MapPinned } from 'lucide-react';
import { Field } from './ui';

/**
 * Google Maps link of the client's home. Staff get it as the "Directions" button.
 * Filled by pasting a shared Maps link, or by tapping "Use my current location" while at home.
 */
export default function MapLinkField({ value, onChange, error, className = '', forClient = false }) {
    const [locating, setLocating] = useState(false);
    const [note, setNote] = useState('');

    const useCurrentLocation = () => {
        if (!navigator.geolocation || !window.isSecureContext) {
            setNote('Location is not available on this browser. Please paste a Google Maps link instead.');
            return;
        }
        setLocating(true);
        setNote('');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                onChange(`https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
                setNote(accuracy > 100 ? `Location found, but only accurate to about ${Math.round(accuracy)} m. Please check it on the map.` : 'Location added.');
                setLocating(false);
            },
            (err) => {
                setNote(
                    err.code === err.PERMISSION_DENIED
                        ? 'Location permission was denied. Allow location for this site, or paste a Google Maps link instead.'
                        : 'Could not get your location. Please try again or paste a Google Maps link.',
                );
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
        );
    };

    return (
        <Field label="Google Maps location link" error={error} className={className}>
            <input
                className="input"
                inputMode="url"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={useCurrentLocation} disabled={locating} className="btn-secondary px-3 py-2 text-xs">
                    {locating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                    {forClient ? "I'm at home: use my current location" : 'Use my current location'}
                </button>
                {value && /^https:\/\//i.test(value) && (
                    <a href={value} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-xs">
                        <ExternalLink size={14} /> Check on map
                    </a>
                )}
            </div>
            {note && <p className="mt-1.5 text-xs text-slate-500">{note}</p>}
            <p className="mt-2 flex gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <MapPinned size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                    Google Maps → find the home → tap <b>Share</b> → <b>Copy link</b> → paste here. Staff will use it for directions.
                    {forClient && (
                        <span lang="gu" className="mt-1 block text-brand-700">
                            Google Maps માં તમારું ઘર શોધો → Share → Copy link → અહીં paste કરો.
                        </span>
                    )}
                </span>
            </p>
        </Field>
    );
}

import { useState } from 'react';
import { MapPin, MapPinOff, Navigation } from 'lucide-react';
import AuthImage from '../components/AuthImage';
import { Modal } from '../components/ui';
import { formatDate, formatTime } from '../lib/format';

const mapUrl = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

/** Selfie thumbnail with the check-in place next to it (for tables and cards). */
export function CheckInCell({ attendance: a, size = 'h-14 w-14' }) {
    if (!a.has_selfie) {
        return <span className="text-xs text-slate-400">No selfie</span>;
    }
    const hasLocation = a.clock_in_lat !== null && a.clock_in_lat !== undefined;
    return (
        <div className="flex w-max items-center gap-3 pr-2">
            <CheckInPhoto attendance={a} size={size} />
            <div className="w-44 shrink-0 text-xs">
                {hasLocation ? (
                    <>
                        <p className="line-clamp-2 whitespace-normal font-medium text-slate-700">{a.clock_in_address || 'Location shared'}</p>
                        <a
                            href={mapUrl(a.clock_in_lat, a.clock_in_lng)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                        >
                            <MapPin size={11} /> Map{a.clock_in_accuracy ? ` · ±${a.clock_in_accuracy} m` : ''}
                        </a>
                    </>
                ) : (
                    <p className="flex items-center gap-1 font-semibold text-rose-600">
                        <MapPinOff size={12} /> No location
                    </p>
                )}
            </div>
        </div>
    );
}

/** Thumbnail of a duty's check-in selfie; opens a viewer with location details. */
export default function CheckInPhoto({ attendance: a, size = 'h-10 w-10' }) {
    const [open, setOpen] = useState(false);
    const hasLocation = a.clock_in_lat !== null && a.clock_in_lat !== undefined;

    if (!a.has_selfie) {
        return <span className="text-xs text-slate-400">No selfie</span>;
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className="relative shrink-0" title="View check-in selfie">
                <AuthImage src={`/admin/attendance/${a.id}/selfie`} alt="Check-in selfie" className={`${size} rounded-xl object-top ring-2 ring-white`} />
                <span
                    className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-white ${hasLocation ? 'bg-emerald-500' : 'bg-rose-500'}`}
                >
                    {hasLocation ? <MapPin size={9} /> : <MapPinOff size={9} />}
                </span>
            </button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={`${a.staff?.name || 'Staff'} · Check-in`}
                subtitle={`${formatDate(a.duty_date)} at ${formatTime(a.clock_in)}${a.client ? ` · ${a.client.name}` : ''}`}
            >
                <AuthImage src={`/admin/attendance/${a.id}/selfie`} alt="Check-in selfie" className="mx-auto max-h-[60vh] w-auto rounded-2xl" />
                <div className={`mt-4 rounded-2xl p-4 text-sm ${hasLocation ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}>
                    {hasLocation ? (
                        <>
                            <p className="flex items-center gap-1.5 font-semibold">
                                <MapPin size={15} /> Location at check-in
                            </p>
                            {a.clock_in_address && <p className="mt-1">{a.clock_in_address}</p>}
                            <p className="mt-1 text-xs opacity-80">
                                {Number(a.clock_in_lat).toFixed(6)}, {Number(a.clock_in_lng).toFixed(6)}
                                {a.clock_in_accuracy ? ` · accurate to ±${a.clock_in_accuracy} m` : ''}
                            </p>
                            <a href={mapUrl(a.clock_in_lat, a.clock_in_lng)} target="_blank" rel="noreferrer" className="btn-primary mt-3 w-full sm:w-auto">
                                <Navigation size={16} /> Open in Google Maps
                            </a>
                        </>
                    ) : (
                        <p className="flex items-center gap-1.5 font-semibold">
                            <MapPinOff size={15} /> Staff started this duty without sharing location.
                        </p>
                    )}
                </div>
            </Modal>
        </>
    );
}

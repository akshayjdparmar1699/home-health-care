import { Clock, HeartHandshake, MapPin, Moon, Navigation, Phone, ShieldAlert, Stethoscope, Sun, Users } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { formatShift, mapsLink, shiftLabel } from '../lib/format';
import { Avatar, EmptyState, Spinner } from '../components/ui';
import { StaffPageHeader } from './StaffLayout';

export default function StaffClients() {
    const { data, loading } = useFetch('/staff/status');

    return (
        <>
            <StaffPageHeader title="My Clients" subtitle="Patients you are assigned to" />
            <div className="space-y-4 px-5">
                {!data ? (
                    <Spinner />
                ) : data.assignments.length === 0 ? (
                    <div className="card">
                        <EmptyState icon={Users} title="No clients assigned" text="Your admin will assign clients to you. They will appear here." />
                    </div>
                ) : (
                    data.assignments.map(({ id, client: c, shift_start, shift_end, shift_hours, shift_type, notes }) => {
                        const address = [c.address, c.city, c.pincode].filter(Boolean).join(', ');
                        return (
                            <div key={id} className="card overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={c.name} size="lg" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-lg font-bold text-slate-900">{c.name}</p>
                                            <p className="text-sm text-slate-500">
                                                {[c.age && `${c.age} yrs`, c.gender].filter(Boolean).join(' · ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                            {shift_type === 'night' ? <Moon size={13} /> : <Sun size={13} />} {shift_hours ? `${shiftLabel(shift_hours, shift_type)} · ` : ''}{formatShift(shift_start, shift_end)}
                                        </span>
                                        {c.service_type && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                                <HeartHandshake size={13} /> {c.service_type}
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                                        <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" /> {address}
                                    </p>

                                    {(c.medical_notes || notes) && (
                                        <div className="mt-3 rounded-xl bg-sky-50 p-3">
                                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700">
                                                <Stethoscope size={13} /> Care instructions
                                            </p>
                                            {c.medical_notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{c.medical_notes}</p>}
                                            {notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{notes}</p>}
                                        </div>
                                    )}

                                    {c.emergency_contact_phone && (
                                        <a href={`tel:${c.emergency_contact_phone}`} className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                                            <ShieldAlert size={16} />
                                            <span>
                                                Emergency: <b>{c.emergency_contact_name || 'Contact'}</b> · {c.emergency_contact_phone}
                                            </span>
                                        </a>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 border-t border-slate-100">
                                    <a href={`tel:${c.phone}`} className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-brand-700 active:bg-slate-50">
                                        <Phone size={17} /> Call
                                    </a>
                                    <a
                                        href={mapsLink(address)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-center gap-2 border-l border-slate-100 py-3.5 text-sm font-semibold text-brand-700 active:bg-slate-50"
                                    >
                                        <Navigation size={17} /> Directions
                                    </a>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}

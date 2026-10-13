import { useEffect, useMemo, useState } from 'react';
import { AlarmClock, Clock, Coffee, IndianRupee, Loader2, LogOut, MapPin, Navigation, Phone, Play, Power } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import useFetch from '../lib/useFetch';
import { formatDate, formatDuration, formatMinutes, formatMoney, formatShift, formatTime, directionsLink, greeting, shiftLabel } from '../lib/format';
import { Modal, Spinner, useToast } from '../components/ui';
import DutyCheckIn from './DutyCheckIn';

/** Best-effort GPS fix; resolves to {} if denied or unavailable. */
function getLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve({});
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve({}),
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
        );
    });
}

/** Re-render every second while active. */
function useNow(active) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active]);
    return now;
}

/**
 * Shift timing for the duty screen banner: the shift that is running now (late) or
 * starts within the next 30 minutes. Night shifts can start yesterday and run past midnight.
 */
function shiftAlert(assignments, now) {
    let result = null;
    for (const a of assignments) {
        if (!a.shift_start || !a.shift_hours) continue;
        const [h, m] = a.shift_start.split(':').map(Number);
        for (const dayOffset of [0, -1, 1]) {
            const start = new Date(now);
            start.setDate(start.getDate() + dayOffset);
            start.setHours(h, m, 0, 0);
            const end = start.getTime() + a.shift_hours * 3600000;
            const diffMin = Math.round((now - start.getTime()) / 60000);
            if (now >= start.getTime() && now < end) return { kind: 'late', assignment: a, start, minutes: diffMin };
            if (diffMin < 0 && diffMin >= -30 && !result) result = { kind: 'soon', assignment: a, start, minutes: -diffMin };
        }
    }
    return result;
}

function computeSeconds(current, now) {
    if (!current) return { worked: 0, onBreak: 0, breakTotal: 0 };
    const breakTotal = current.breaks.reduce((sum, b) => {
        const end = b.break_end ? new Date(b.break_end).getTime() : now;
        return sum + Math.max(0, end - new Date(b.break_start).getTime());
    }, 0);
    const open = current.breaks.find((b) => !b.break_end);
    const total = now - new Date(current.clock_in).getTime();
    return {
        worked: Math.max(0, (total - breakTotal) / 1000),
        onBreak: open ? Math.max(0, (now - new Date(open.break_start).getTime()) / 1000) : 0,
        breakTotal: breakTotal / 1000,
    };
}

export default function StaffHome() {
    const { user } = useAuth();
    const toast = useToast();
    const { data, loading, reload } = useFetch('/staff/status', null, { interval: 60000 });
    const [busy, setBusy] = useState(null);
    const [pickOpen, setPickOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [checkIn, setCheckIn] = useState(null); // { assignment } while the selfie check-in is open

    const current = data?.current;
    const status = current?.status || 'off_duty';
    const offset = useMemo(() => (data ? new Date(data.server_time).getTime() - Date.now() : 0), [data]);
    const now = useNow(true) + offset;
    const secs = computeSeconds(current, now);

    if (!data) return <Spinner className="min-h-[70vh]" />;

    const act = async (key, url, body = {}, withLocation = false) => {
        setBusy(key);
        try {
            const loc = withLocation ? await getLocation() : {};
            await api.post(url, { ...body, ...loc });
            await reload(true);
            return true;
        } catch (e) {
            toast(errorMessage(e), 'error');
            return false;
        } finally {
            setBusy(null);
        }
    };

    // Starting a duty always goes through the selfie + location check-in.
    const startDuty = (assignmentId) => {
        setPickOpen(false);
        setCheckIn({ assignment: data.assignments.find((a) => a.id === assignmentId) || null });
    };

    const submitCheckIn = async ({ selfie, lat, lng, accuracy, address }) => {
        const fd = new FormData();
        if (checkIn?.assignment) fd.append('assignment_id', checkIn.assignment.id);
        if (lat !== undefined) {
            fd.append('lat', lat);
            fd.append('lng', lng);
            fd.append('accuracy', accuracy);
        }
        if (address) fd.append('address', address);
        fd.append('selfie', selfie, 'selfie.jpg');
        try {
            await api.post('/staff/duty/start', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            await reload(true);
            setCheckIn(null);
            toast('Duty started. Have a great shift!');
        } catch (e) {
            toast(errorMessage(e), 'error');
        }
    };

    const onStartClick = () => {
        if (data.assignments.length > 1) setPickOpen(true);
        else startDuty(data.assignments[0]?.id ?? null);
    };

    const endDuty = async () => {
        if (await act('end', '/staff/duty/end', { notes: notes || null }, true)) {
            toast('Duty ended. Thank you!');
            setEndOpen(false);
            setNotes('');
        }
    };

    const theme = {
        off_duty: { bg: 'from-brand-800 to-brand-900', ring: 'bg-slate-400', label: 'You are off duty' },
        on_duty: { bg: 'from-brand-700 via-[#6a3a72] to-accent-500', ring: 'bg-emerald-300', label: 'You are on duty' },
        on_break: { bg: 'from-amber-500 to-orange-600', ring: 'bg-amber-200', label: 'You are on a break' },
    }[status];

    return (
        <div>
            {/* Hero status card */}
            <div className={`relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br safe-top-6 px-5 pb-14 text-white shadow-lg transition-colors duration-500 ${theme.bg}`}>
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
                <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5" />

                <img src="/brand/emblem-white.png" alt="" className="pointer-events-none absolute -right-10 top-6 w-44 opacity-10" />
                <div className="relative">
                    <p className="text-sm text-white/70">{formatDate(new Date(), { weekday: 'long', year: undefined })}</p>
                    <h1 className="text-2xl font-extrabold">
                        {greeting()}, {user.name.split(' ')[0]}
                    </h1>

                    <div className="mt-7 flex flex-col items-center text-center">
                        <div className="flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold backdrop-blur">
                            <span className="relative flex h-2.5 w-2.5">
                                {status !== 'off_duty' && <span className={`absolute inset-0 animate-ping rounded-full ${theme.ring}`} />}
                                <span className={`relative h-2.5 w-2.5 rounded-full ${theme.ring}`} />
                            </span>
                            {theme.label}
                        </div>

                        {status === 'off_duty' ? (
                            <>
                                <p className="mt-6 text-6xl font-extrabold tabular-nums tracking-tight">
                                    {new Date(now).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </p>
                                <p className="mt-2 text-sm text-white/70">Tap the button below to start your duty</p>
                            </>
                        ) : status === 'on_break' ? (
                            <>
                                <p className="mt-6 text-6xl font-extrabold tabular-nums tracking-tight">{formatDuration(secs.onBreak)}</p>
                                <p className="mt-2 text-sm text-white/80">
                                    Break time · Worked so far <b>{formatDuration(secs.worked)}</b>
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="mt-6 text-6xl font-extrabold tabular-nums tracking-tight">{formatDuration(secs.worked)}</p>
                                <p className="mt-2 text-sm text-white/80">
                                    Started at <b>{formatTime(current.clock_in)}</b>
                                    {current.shift_hours ? <> · {shiftLabel(current.shift_hours, current.shift_type)}</> : null}
                                    {secs.breakTotal > 0 && <> · Break {formatMinutes(secs.breakTotal / 60)}</>}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="relative z-10 -mt-8 space-y-3 px-5">
                {status === 'off_duty' && (
                    <button
                        onClick={onStartClick}
                        disabled={!!busy}
                        className="relative flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-500 py-5 text-lg font-extrabold text-white shadow-xl shadow-emerald-500/30 transition active:scale-[0.98] disabled:opacity-70"
                    >
                        {busy === 'start' ? <Loader2 className="animate-spin" /> : <Play size={24} fill="currentColor" />}
                        Start Duty
                    </button>
                )}

                {/* Shift time alert (off duty only) */}
                {status === 'off_duty' &&
                    (() => {
                        const alert = shiftAlert(data.assignments, now);
                        if (!alert) return null;
                        const late = alert.kind === 'late';
                        const label = `${shiftLabel(alert.assignment.shift_hours, alert.assignment.shift_type)} at ${alert.assignment.client?.name}`;
                        return (
                            <div
                                className={`flex items-start gap-3 rounded-2xl p-4 shadow-lg ${
                                    late ? 'animate-pulse bg-rose-600 text-white shadow-rose-600/30' : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                                }`}
                            >
                                <AlarmClock size={22} className="mt-0.5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold">
                                        {late
                                            ? alert.minutes < 1
                                                ? 'Your duty starts now!'
                                                : `You are ${formatMinutes(alert.minutes)} late for duty`
                                            : `Your duty starts in ${alert.minutes} min`}
                                    </p>
                                    <p className={late ? 'text-white/90' : ''}>
                                        {label}, {late ? 'started' : 'starts'} at {formatTime(alert.start)}. Tap Start Duty and take your selfie.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}

                {status === 'on_duty' && (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => act('break', '/staff/duty/break-start').then((ok) => ok && toast('Break started. Relax!'))}
                            disabled={!!busy}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 font-bold text-amber-600 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 transition active:scale-[0.97] disabled:opacity-70"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                                {busy === 'break' ? <Loader2 className="animate-spin" size={24} /> : <Coffee size={24} />}
                            </span>
                            Take Break
                        </button>
                        <button
                            onClick={() => setEndOpen(true)}
                            disabled={!!busy}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 font-bold text-rose-600 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 transition active:scale-[0.97] disabled:opacity-70"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
                                <Power size={24} />
                            </span>
                            End Duty
                        </button>
                    </div>
                )}

                {status === 'on_break' && (
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => act('resume', '/staff/duty/break-end').then((ok) => ok && toast('Welcome back! Duty resumed.'))}
                            disabled={!!busy}
                            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-5 text-lg font-extrabold text-white shadow-xl shadow-emerald-500/30 transition active:scale-[0.98] disabled:opacity-70"
                        >
                            {busy === 'resume' ? <Loader2 className="animate-spin" /> : <Play size={22} fill="currentColor" />}
                            Resume Duty
                        </button>
                        <button
                            onClick={() => setEndOpen(true)}
                            disabled={!!busy}
                            className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white text-sm font-bold text-rose-600 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100 active:scale-[0.97]"
                        >
                            <Power size={22} /> End
                        </button>
                    </div>
                )}

                {/* Current client */}
                {current?.client && (
                    <div className="card p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Currently caring for</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{current.client.name}</p>
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                            <MapPin size={15} className="mt-0.5 shrink-0" /> {current.client.address}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <a href={`tel:${current.client.phone}`} className="btn-secondary">
                                <Phone size={16} /> Call
                            </a>
                            <a href={directionsLink(current.client)} target="_blank" rel="noreferrer" className="btn-secondary">
                                <Navigation size={16} /> Directions
                            </a>
                        </div>
                    </div>
                )}

                {/* Today summary */}
                <div className="card p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Today</p>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                        <div>
                            <Clock size={18} className="mx-auto text-brand-600" />
                            <p className="mt-1 text-lg font-extrabold text-slate-900">
                                {formatMinutes(data.today.worked_minutes - (current?.live_worked_minutes || 0) + secs.worked / 60)}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400">WORKED</p>
                        </div>
                        <div>
                            <Coffee size={18} className="mx-auto text-amber-500" />
                            <p className="mt-1 text-lg font-extrabold text-slate-900">
                                {formatMinutes(data.today.break_minutes - (current?.live_break_minutes || 0) + secs.breakTotal / 60)}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400">BREAK</p>
                        </div>
                        <div>
                            <IndianRupee size={18} className="mx-auto text-emerald-500" />
                            <p className="mt-1 text-lg font-extrabold text-slate-900">
                                {formatMoney(data.today.earned)}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400">EARNED</p>
                            {data.today.pending_approval > 0 && <p className="mt-0.5 text-[10px] font-semibold text-amber-600">+{data.today.pending_approval} awaiting approval</p>}
                        </div>
                    </div>
                </div>

                {/* Today's timeline */}
                {current && (
                    <div className="card p-4">
                        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Current shift timeline</p>
                        <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
                            <li className="relative">
                                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                                <p className="text-sm font-semibold text-slate-800">Duty started</p>
                                <p className="text-xs text-slate-400">{formatTime(current.clock_in)}</p>
                            </li>
                            {current.breaks.map((b) => (
                                <li key={b.id} className="relative">
                                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                                    <p className="text-sm font-semibold text-slate-800">{b.break_end ? 'Break' : 'On break now'}</p>
                                    <p className="text-xs text-slate-400">
                                        {formatTime(b.break_start)}
                                        {b.break_end && ` - ${formatTime(b.break_end)}`}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {status === 'off_duty' && data.assignments.length > 0 && (
                    <div className="card p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Your assignments</p>
                        <ul className="divide-y divide-slate-100">
                            {data.assignments.map((a) => (
                                <li key={a.id} className="py-2.5">
                                    <p className="font-semibold text-slate-800">{a.client.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {a.shift_hours ? `${shiftLabel(a.shift_hours, a.shift_type)} · ` : ''}{formatShift(a.shift_start, a.shift_end)} · {a.client.city || a.client.address}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <DutyCheckIn open={!!checkIn} client={checkIn?.assignment?.client} onClose={() => setCheckIn(null)} onSubmit={submitCheckIn} />

            {/* Choose client */}
            <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="Where are you working today?" subtitle="Choose the client to start duty">
                <div className="space-y-2">
                    {data.assignments.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => startDuty(a.id)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-400 hover:bg-brand-50 active:scale-[0.99]"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                                <MapPin size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900">{a.client.name}</p>
                                <p className="truncate text-sm text-slate-500">{a.client.address}</p>
                                <p className="text-xs font-medium text-brand-700">{a.shift_hours ? `${shiftLabel(a.shift_hours, a.shift_type)} · ` : ''}{formatShift(a.shift_start, a.shift_end)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>

            {/* End duty confirmation */}
            <Modal
                open={endOpen}
                onClose={() => setEndOpen(false)}
                title="End your duty?"
                subtitle="Your hours will be saved"
                size="sm"
                footer={
                    <>
                        <button className="btn-secondary flex-1 sm:flex-none" onClick={() => setEndOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn-danger flex-1 sm:flex-none" onClick={endDuty} disabled={busy === 'end'}>
                            {busy === 'end' ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} End Duty
                        </button>
                    </>
                }
            >
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-brand-50 p-4 text-center">
                        <p className="text-xs font-semibold text-brand-700">Worked</p>
                        <p className="text-2xl font-extrabold text-slate-900">{formatMinutes(secs.worked / 60)}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-4 text-center">
                        <p className="text-xs font-semibold text-amber-700">Break</p>
                        <p className="text-2xl font-extrabold text-slate-900">{formatMinutes(secs.breakTotal / 60)}</p>
                    </div>
                </div>
                <label className="label mt-4">Notes for admin (optional)</label>
                <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Patient had lunch, BP normal, medicines given"
                />
            </Modal>
        </div>
    );
}

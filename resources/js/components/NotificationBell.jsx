import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, IndianRupee, X } from 'lucide-react';
import api from '../lib/api';
import { formatMinutes, formatMoney, shiftLabel, timeAgo } from '../lib/format';

const POLL_MS = 15000;

function describe(n) {
    const d = n.data || {};
    return {
        title: `${d.staff_name || 'Staff'} ended duty · approve payment`,
        place: [d.client_name, d.shift_hours ? shiftLabel(d.shift_hours, d.shift_type) : null, d.worked_minutes ? `${formatMinutes(d.worked_minutes)} worked` : null]
            .filter(Boolean)
            .join(' · '),
        body: `Staff pay ${formatMoney(d.staff_amount)} · Client charge ${formatMoney(d.client_amount)} · Profit ${formatMoney(d.profit)}`,
        d,
    };
}

/** Show an OS-level notification (works in the background tab / installed app when allowed). */
async function systemNotify(n) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const { title, place, body } = describe(n);
    const options = { body: `${place}\n${body}`, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: n.id };
    try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) await reg.showNotification(title, options);
        else new Notification(title, options);
    } catch {
        // notifications not supported here
    }
}

function Amounts({ d, compact = false }) {
    return (
        <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-1.5' : 'mt-2'}`}>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Pay {formatMoney(d.staff_amount)}</span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Charge {formatMoney(d.client_amount)}</span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${d.profit >= 0 ? 'bg-accent-50 text-accent-700' : 'bg-rose-50 text-rose-700'}`}>
                Profit {formatMoney(d.profit)}
            </span>
        </div>
    );
}

/** Admin bell: polls for new duty notifications, shows a popup + system notification for each new one. */
export default function NotificationBell({ className = '' }) {
    const navigate = useNavigate();
    const [data, setData] = useState({ unread: 0, items: [] });
    const [open, setOpen] = useState(false);
    const [popups, setPopups] = useState([]);
    const seen = useRef(null);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const res = await api.get('/admin/notifications');
                if (!alive) return;
                const items = res.data.items;
                if (seen.current === null) {
                    seen.current = new Set(items.map((i) => i.id)); // first load: no popups for old ones
                } else {
                    const fresh = items.filter((i) => !seen.current.has(i.id) && !i.read_at);
                    fresh.forEach((i) => seen.current.add(i.id));
                    if (fresh.length) {
                        setPopups((p) => [...fresh, ...p].slice(0, 3));
                        fresh.forEach((i) => {
                            systemNotify(i);
                            setTimeout(() => setPopups((p) => p.filter((x) => x.id !== i.id)), 9000);
                        });
                    }
                }
                setData(res.data);
            } catch {
                // offline or logged out; try again next tick
            }
        };
        load();
        const id = setInterval(load, POLL_MS);
        const onFocus = () => load();
        window.addEventListener('focus', onFocus);
        return () => {
            alive = false;
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const openItem = async (n) => {
        setOpen(false);
        setPopups((p) => p.filter((x) => x.id !== n.id));
        if (!n.read_at) {
            api.post(`/admin/notifications/${n.id}/read`).catch(() => {});
            setData((s) => ({ unread: Math.max(0, s.unread - 1), items: s.items.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)) }));
        }
        navigate(n.data?.type === 'duty_completed' ? `/admin/attendance?approve=${n.data.attendance_id}` : '/admin/attendance');
    };

    const readAll = async () => {
        await api.post('/admin/notifications/read-all').catch(() => {});
        setData((s) => ({ unread: 0, items: s.items.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })) }));
    };

    return (
        <>
            <div className={`relative ${className}`}>
                <button
                    onClick={() => setOpen(!open)}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
                    aria-label="Notifications"
                >
                    {data.unread > 0 ? <BellRing size={21} className="text-brand-700" /> : <Bell size={21} />}
                    {data.unread > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                            {data.unread > 99 ? '99+' : data.unread}
                        </span>
                    )}
                </button>

                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <div className="animate-slide-up fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[380px]">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <p className="font-bold text-slate-900">Notifications</p>
                                {data.unread > 0 && (
                                    <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                                        <CheckCheck size={14} /> Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                {data.items.length === 0 ? (
                                    <p className="px-4 py-10 text-center text-sm text-slate-400">No notifications yet. You will be notified when staff end a duty.</p>
                                ) : (
                                    data.items.map((n) => {
                                        const { title, place, d } = describe(n);
                                        return (
                                            <button
                                                key={n.id}
                                                onClick={() => openItem(n)}
                                                className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${n.read_at ? '' : 'bg-brand-50/50'}`}
                                            >
                                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                                    <IndianRupee size={17} />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex items-start justify-between gap-2">
                                                        <span className="text-sm font-semibold text-slate-900">{title}</span>
                                                        {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                                                    </span>
                                                    <span className="block truncate text-xs text-slate-500">{place}</span>
                                                    <Amounts d={d} compact />
                                                    <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Live popups for brand-new notifications */}
            <div className="pointer-events-none fixed right-3 top-3 z-[95] flex w-[min(360px,calc(100vw-24px))] flex-col gap-2">
                {popups.map((n) => {
                    const { title, place, d } = describe(n);
                    return (
                        <div key={n.id} className="animate-slide-up pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                            <div className="bg-brand-gradient h-1" />
                            <div className="flex gap-3 p-3.5">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <IndianRupee size={19} />
                                </span>
                                <button onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-bold text-slate-900">{title}</p>
                                    <p className="truncate text-xs text-slate-500">{place}</p>
                                    <Amounts d={d} compact />
                                </button>
                                <button onClick={() => setPopups((p) => p.filter((x) => x.id !== n.id))} className="self-start rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Dismiss">
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

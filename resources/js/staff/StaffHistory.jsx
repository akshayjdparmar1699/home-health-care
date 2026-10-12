import { useState } from 'react';
import { CalendarDays, Clock, Coffee, MapPin } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, formatTime, todayISO } from '../lib/format';
import { EmptyState, Spinner, StatusBadge } from '../components/ui';
import { StaffPageHeader } from './StaffLayout';

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const ranges = [
    ['7 days', 6],
    ['This month', 'month'],
    ['30 days', 29],
];

export default function StaffHistory() {
    const [range, setRange] = useState('month');
    const from = range === 'month' ? todayISO().slice(0, 8) + '01' : daysAgo(range);
    const { data, loading } = useFetch('/staff/history', { from, to: todayISO() });

    // Group records by date for a day-wise list.
    const grouped = (data?.records || []).reduce((acc, r) => {
        (acc[r.duty_date] ||= []).push(r);
        return acc;
    }, {});

    return (
        <>
            <StaffPageHeader title="My Hours" subtitle="Your duty history and total working hours" />

            <div className="space-y-4 px-5">
                <div className="flex rounded-xl bg-slate-200/60 p-1">
                    {ranges.map(([label, v]) => (
                        <button
                            key={label}
                            onClick={() => setRange(v)}
                            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${range === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {!data ? (
                    <Spinner />
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-brand-gradient rounded-2xl p-4 text-white shadow-lg shadow-accent-500/20">
                                <Clock size={18} className="text-brand-200" />
                                <p className="mt-2 text-xl font-extrabold">{formatMinutes(data.summary.worked_minutes)}</p>
                                <p className="text-[11px] font-semibold text-brand-100">WORKED · {formatMoney(data.summary.earned)}</p>
                            </div>
                            <div className="card p-4">
                                <CalendarDays size={18} className="text-sky-500" />
                                <p className="mt-2 text-xl font-extrabold text-slate-900">{data.summary.days}</p>
                                <p className="text-[11px] font-semibold text-slate-400">DAYS</p>
                            </div>
                            <div className="card p-4">
                                <Coffee size={18} className="text-amber-500" />
                                <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMinutes(data.summary.break_minutes)}</p>
                                <p className="text-[11px] font-semibold text-slate-400">BREAK</p>
                            </div>
                        </div>

                        {data.records.length === 0 ? (
                            <div className="card">
                                <EmptyState icon={CalendarDays} title="No duties in this period" text="Your completed duties will show here." />
                            </div>
                        ) : (
                            Object.entries(grouped).map(([date, rows]) => (
                                <div key={date}>
                                    <div className="mb-2 flex items-center justify-between px-1">
                                        <p className="text-sm font-bold text-slate-700">{formatDate(date, { weekday: 'short', year: undefined })}</p>
                                        <p className="text-sm font-bold text-brand-700">
                                            {formatMinutes(rows.reduce((s, r) => s + r.live_worked_minutes, 0))}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        {rows.map((r) => (
                                            <div key={r.id} className="card p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1.5 truncate font-semibold text-slate-800">
                                                            <MapPin size={14} className="shrink-0 text-slate-400" />
                                                            {r.client?.name || 'General duty'}
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {formatTime(r.clock_in)} - {r.clock_out ? formatTime(r.clock_out) : 'Now'}
                                                        </p>
                                                    </div>
                                                    {r.status === 'completed' && !r.approved_at ? (
                                                        <div className="text-right">
                                                            <p className="text-lg font-extrabold text-slate-900">{formatMinutes(r.live_worked_minutes)}</p>
                                                            <p className="text-xs font-semibold text-amber-600">Awaiting approval</p>
                                                        </div>
                                                    ) : r.status === 'completed' ? (
                                                        <div className="text-right">
                                                            <p className="text-lg font-extrabold text-slate-900">{formatMinutes(r.live_worked_minutes)}</p>
                                                            <p className="text-xs font-semibold text-emerald-600">{formatMoney(r.staff_amount)}</p>
                                                            {r.live_break_minutes > 0 && (
                                                                <p className="text-xs text-amber-600">{formatMinutes(r.live_break_minutes)} break</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <StatusBadge status={r.status} />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>
        </>
    );
}

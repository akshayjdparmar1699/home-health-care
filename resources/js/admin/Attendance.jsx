import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Clock, Coffee, Download, IndianRupee, Loader2, MapPin, Pencil, Square, Users, Wallet } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, formatTime, shiftLabel, toLocalInput, todayISO } from '../lib/format';
import { Avatar, EmptyState, Field, Modal, PageHeader, Spinner, StatCard, StatusBadge, useToast } from '../components/ui';
import { CheckInCell } from './CheckInPhoto';
import ApproveDutyModal from './ApproveDutyModal';

const monthStart = () => todayISO().slice(0, 8) + '01';

function shiftDays(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const presets = [
    ['Today', () => [todayISO(), todayISO()]],
    ['7 days', () => [shiftDays(6), todayISO()]],
    ['This month', () => [monthStart(), todayISO()]],
    ['30 days', () => [shiftDays(29), todayISO()]],
];

function EditModal({ record, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ clock_in: '', clock_out: '', notes: '', staff_amount: '', client_amount: '', auto_amount: false });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (record)
            setForm({
                clock_in: toLocalInput(record.clock_in),
                clock_out: toLocalInput(record.clock_out),
                notes: record.notes || '',
                staff_amount: record.manual_amount ? record.staff_amount : '',
                client_amount: record.manual_amount ? record.client_amount : '',
                auto_amount: false,
            });
    }, [record]);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/admin/attendance/${record.id}`, {
                clock_in: form.clock_in,
                clock_out: form.clock_out || null,
                notes: form.notes || null,
                staff_amount: form.staff_amount === '' ? null : form.staff_amount,
                client_amount: form.client_amount === '' ? null : form.client_amount,
                auto_amount: form.auto_amount,
            });
            toast('Attendance updated');
            onSaved();
            onClose();
        } catch (err) {
            toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={!!record}
            onClose={onClose}
            title="Edit duty"
            subtitle={record && `${record.staff?.name} · ${formatDate(record.duty_date)}`}
            size="sm"
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="att-form" className="btn-primary" disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} Save
                    </button>
                </>
            }
        >
            <form id="att-form" onSubmit={submit} className="space-y-4">
                <Field label="Clock in">
                    <input type="datetime-local" className="input" value={form.clock_in} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} required />
                </Field>
                <Field label="Clock out" hint="Setting this will end the duty">
                    <input type="datetime-local" className="input" value={form.clock_out} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} />
                </Field>
                <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">Payment for this duty</p>
                    <p className="mb-3 text-xs text-slate-500">
                        {record?.shift_hours ? `${shiftLabel(record.shift_hours, record.shift_type)}. ` : ''}Normally the full shift rate is used. Change it only for this duty, e.g. a half
                        shift.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Staff pay (₹)" hint={record?.payout_id ? 'Already paid, locked' : `Shift rate ${formatMoney(record?.staff_rate)}`}>
                            <input
                                type="number"
                                min="0"
                                className="input"
                                value={form.staff_amount}
                                disabled={!!record?.payout_id || form.auto_amount}
                                onChange={(e) => setForm({ ...form, staff_amount: e.target.value })}
                                placeholder={String(record?.live_staff_amount ?? '')}
                            />
                        </Field>
                        <Field label="Client charge (₹)" hint={record?.invoice_id ? 'Already billed, locked' : `Shift rate ${formatMoney(record?.client_rate)}`}>
                            <input
                                type="number"
                                min="0"
                                className="input"
                                value={form.client_amount}
                                disabled={!!record?.invoice_id || form.auto_amount}
                                onChange={(e) => setForm({ ...form, client_amount: e.target.value })}
                                placeholder={String(record?.live_client_amount ?? '')}
                            />
                        </Field>
                    </div>
                    {record?.manual_amount && (
                        <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.auto_amount} onChange={(e) => setForm({ ...form, auto_amount: e.target.checked })} />
                            Go back to the normal shift rate
                        </label>
                    )}
                </div>
                <Field label="Notes">
                    <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Field>
            </form>
        </Modal>
    );
}

export default function Attendance() {
    const toast = useToast();
    const [params] = useSearchParams();
    const [filters, setFilters] = useState({
        from: monthStart(),
        to: todayISO(),
        staff_id: params.get('staff_id') || '',
        client_id: params.get('client_id') || '',
        approval: params.get('approval') || (params.get('approve') ? 'pending' : ''),
    });
    const [approving, setApproving] = useState(null);
    const autoOpened = useRef(false);
    const [view, setView] = useState('records');
    const [editing, setEditing] = useState(null);
    const [exporting, setExporting] = useState(false);
    const { data, loading, reload } = useFetch('/admin/attendance', filters);
    const { data: staff } = useFetch('/admin/staff');
    const { data: clients } = useFetch('/admin/clients');

    const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

    // Opened from a "duty ended" notification: show that duty's approval straight away.
    useEffect(() => {
        const id = Number(params.get('approve'));
        if (!id || autoOpened.current || !data) return;
        const record = data.records.find((r) => r.id === id);
        if (record) {
            autoOpened.current = true;
            if (record.status === 'completed' && !record.approved_at) setApproving(record);
        }
    }, [data, params]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await api.get('/admin/attendance/export', { params: filters, responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance-${filters.from}-to-${filters.to}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setExporting(false);
        }
    };

    const closeDuty = async (r) => {
        try {
            await api.post(`/admin/attendance/${r.id}/close`);
            toast(`Duty ended for ${r.staff?.name}`);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        }
    };

    return (
        <>
            <PageHeader
                title="Attendance & Hours"
                subtitle="Duty time, breaks and total hours of every staff"
                action={
                    <button className="btn-secondary" onClick={exportCsv} disabled={exporting}>
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export Excel
                    </button>
                }
            />

            <div className="card mb-5 space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilters({ ...filters, approval: filters.approval === 'pending' ? '' : 'pending' })}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                            filters.approval === 'pending' ? 'bg-accent-500 text-white' : 'bg-accent-50 text-accent-700 hover:bg-accent-100'
                        }`}
                    >
                        <CheckCircle2 size={13} /> Needs approval{data?.summary?.pending_approval ? ` (${data.summary.pending_approval})` : ''}
                    </button>
                    {presets.map(([label, fn]) => {
                        const [f, t] = fn();
                        const active = filters.from === f && filters.to === t;
                        return (
                            <button
                                key={label}
                                onClick={() => setFilters({ ...filters, from: f, to: t })}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                    active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Field label="From">
                        <input type="date" className="input" value={filters.from} onChange={set('from')} max={filters.to} />
                    </Field>
                    <Field label="To">
                        <input type="date" className="input" value={filters.to} onChange={set('to')} min={filters.from} />
                    </Field>
                    <Field label="Staff">
                        <select className="input" value={filters.staff_id} onChange={set('staff_id')}>
                            <option value="">All staff</option>
                            {staff?.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Client">
                        <select className="input" value={filters.client_id} onChange={set('client_id')}>
                            <option value="">All clients</option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            {!data ? (
                <Spinner />
            ) : (
                <>
                    <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <StatCard icon={Clock} label="Total hours worked" value={formatMinutes(data.summary.worked_minutes)} />
                        <StatCard icon={Coffee} label="Total break time" value={formatMinutes(data.summary.break_minutes)} tone="amber" />
                        <StatCard icon={Wallet} label="Staff pay" value={formatMoney(data.summary.staff_amount)} tone="violet" sub={`${data.summary.sessions} duties · ${data.summary.staff_count} staff`} />
                        <StatCard icon={IndianRupee} label="Client charges" value={formatMoney(data.summary.client_amount)} tone="green" sub={`Profit ${formatMoney(data.summary.client_amount - data.summary.staff_amount)}`} />
                    </div>

                    <div className="mb-3 flex rounded-xl bg-slate-100 p-1 sm:w-fit">
                        {[
                            ['records', 'All records'],
                            ['staff', 'Staff-wise total'],
                        ].map(([v, l]) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                                    view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                                }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    {view === 'staff' ? (
                        <div className="card overflow-hidden">
                            {data.by_staff.length === 0 ? (
                                <EmptyState icon={Users} title="No data for this period" />
                            ) : (
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Staff</th>
                                                <th>Days</th>
                                                <th>Sessions</th>
                                                <th>Break</th>
                                                <th>Hours worked</th>
                                                <th>Staff pay</th>
                                                <th>Client charge</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.by_staff.map((s) => (
                                                <tr key={s.staff_id}>
                                                    <td>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={s.name} size="sm" />
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{s.name}</p>
                                                                <p className="text-xs text-slate-400">{s.designation}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{s.days}</td>
                                                    <td>{s.sessions}</td>
                                                    <td className="text-slate-500">{formatMinutes(s.break_minutes)}</td>
                                                    <td className="text-base font-extrabold text-brand-700">{formatMinutes(s.worked_minutes)}</td>
                                                    <td className="font-semibold">{formatMoney(s.staff_amount)}</td>
                                                    <td className="font-semibold text-emerald-700">{formatMoney(s.client_amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : data.records.length === 0 ? (
                        <div className="card">
                            <EmptyState icon={CalendarCheck} title="No attendance in this period" text="Try changing the date range or filters." />
                        </div>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="card hidden overflow-hidden md:block">
                                <div className="table-wrap">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Staff</th>
                                                <th>Check-in</th>
                                                <th>Client</th>
                                                <th>Clock in</th>
                                                <th>Clock out</th>
                                                <th>Break</th>
                                                <th>Worked</th>
                                                <th>Pay / Charge</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.records.map((r) => (
                                                <tr key={r.id} className="hover:bg-slate-50/60">
                                                    <td className="font-medium">{formatDate(r.duty_date, { year: undefined })}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar name={r.staff?.name} size="sm" />
                                                            <span className="font-semibold text-slate-800">{r.staff?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <CheckInCell attendance={r} />
                                                    </td>
                                                    <td className="text-slate-600">{r.client?.name || '-'}</td>
                                                    <td className="text-slate-600">{formatTime(r.clock_in)}</td>
                                                    <td>{r.clock_out ? <span className="text-slate-600">{formatTime(r.clock_out)}</span> : <StatusBadge status={r.status} />}</td>
                                                    <td className="text-slate-500">{formatMinutes(r.live_break_minutes)}</td>
                                                    <td className="font-bold text-slate-900">{formatMinutes(r.live_worked_minutes)}</td>
                                                    <td className="text-xs">
                                                        <span className="text-slate-700">{formatMoney(r.live_staff_amount)}</span>
                                                        <span className="text-slate-300"> / </span>
                                                        <span className="font-semibold text-emerald-700">{formatMoney(r.live_client_amount)}</span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {r.status === 'completed' && !r.approved_at && (
                                                                <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => setApproving(r)}>
                                                                    <CheckCircle2 size={13} /> Approve
                                                                </button>
                                                            )}
                                                            {r.status !== 'completed' && (
                                                                <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => closeDuty(r)} title="End this duty now">
                                                                    <Square size={13} /> End
                                                                </button>
                                                            )}
                                                            <button className="btn-ghost px-2 py-1" onClick={() => setEditing(r)} title="Correct times">
                                                                <Pencil size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="space-y-3 md:hidden">
                                {data.records.map((r) => (
                                    <div key={r.id} className="card p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={r.staff?.name} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{r.staff?.name}</p>
                                                <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                                                    <MapPin size={11} /> {r.client?.name || 'No client'} · {formatDate(r.duty_date, { year: undefined })} ·{' '}
                                                    {formatMoney(r.live_staff_amount)} / {formatMoney(r.live_client_amount)}
                                                </p>
                                            </div>
                                            <p className="text-lg font-extrabold text-slate-900">{formatMinutes(r.live_worked_minutes)}</p>
                                        </div>
                                        {r.has_selfie && (
                                            <div className="mt-3 rounded-xl border border-slate-100 p-2.5">
                                                <CheckInCell attendance={r} size="h-16 w-16" />
                                            </div>
                                        )}
                                        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                                            <div>
                                                <p className="text-[11px] font-semibold text-slate-400">IN</p>
                                                <p className="text-sm font-semibold">{formatTime(r.clock_in)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-slate-400">OUT</p>
                                                <p className="text-sm font-semibold">{r.clock_out ? formatTime(r.clock_out) : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-slate-400">BREAK</p>
                                                <p className="text-sm font-semibold">{formatMinutes(r.live_break_minutes)}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between">
                                            {r.status === 'completed' && !r.approved_at ? (
                                                <StatusBadge status="on_break" label="Needs approval" />
                                            ) : (
                                                <StatusBadge status={r.status} />
                                            )}
                                            <div className="flex gap-1">
                                                {r.status === 'completed' && !r.approved_at && (
                                                    <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={() => setApproving(r)}>
                                                        <CheckCircle2 size={13} /> Approve
                                                    </button>
                                                )}
                                                {r.status !== 'completed' && (
                                                    <button className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600" onClick={() => closeDuty(r)}>
                                                        <Square size={13} /> End duty
                                                    </button>
                                                )}
                                                <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setEditing(r)}>
                                                    <Pencil size={13} /> Edit
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            <EditModal record={editing} onClose={() => setEditing(null)} onSaved={() => reload(true)} />
            <ApproveDutyModal record={approving} onClose={() => setApproving(null)} onSaved={() => reload(true)} />
        </>
    );
}

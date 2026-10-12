import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock, History, MapPin, Pencil, Plus, RotateCcw, Share2, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMoney, formatShift, shiftLabel } from '../lib/format';
import { Avatar, ConfirmDialog, EmptyState, PageHeader, SearchInput, Spinner, StatusBadge, useToast } from '../components/ui';
import AssignmentForm from './AssignmentForm';
import CloseAssignmentModal from './CloseAssignmentModal';
import AssignmentShare from '../components/AssignmentShare';

function People({ a }) {
    return (
        <div className="flex items-center gap-3">
            <Link to={`/admin/staff/${a.staff_id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={a.staff?.name} size="sm" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{a.staff?.name}</p>
                    <p className="truncate text-xs text-slate-500">{a.staff?.designation}</p>
                </div>
            </Link>
            <ArrowRight size={16} className="shrink-0 text-slate-300" />
            <Link to={`/admin/clients/${a.client_id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={a.client?.name} size="sm" />
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{a.client?.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin size={11} /> {a.client?.city || a.client?.address}
                    </p>
                </div>
            </Link>
        </div>
    );
}

export default function Assignments() {
    const toast = useToast();
    const [tab, setTab] = useState('active');
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ open: false, assignment: null });
    const [closing, setClosing] = useState(null);
    const [sharing, setSharing] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [busy, setBusy] = useState(false);
    const { data, loading, reload } = useFetch('/admin/assignments', { search, status: tab });

    const remove = async () => {
        setBusy(true);
        try {
            await api.delete(`/admin/assignments/${toDelete.id}`);
            toast('Assignment deleted');
            setToDelete(null);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setBusy(false);
        }
    };

    const reopen = async (a) => {
        try {
            await api.post(`/admin/assignments/${a.id}/reopen`);
            toast(`Reopened. ${a.staff?.name} can see ${a.client?.name} again.`);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        }
    };

    return (
        <>
            <PageHeader
                title="Assignments"
                subtitle="Which staff goes to which client"
                action={
                    <button className="btn-primary" onClick={() => setForm({ open: true, assignment: null })}>
                        <Plus size={18} /> Assign staff
                    </button>
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex rounded-xl bg-slate-100 p-1">
                    {[
                        ['active', 'Active', ClipboardList],
                        ['closed', 'History (closed)', History],
                    ].map(([value, label, Icon]) => (
                        <button
                            key={value}
                            onClick={() => setTab(value)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                                tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>
                <SearchInput value={search} onChange={setSearch} placeholder="Search staff or client" />
            </div>

            {!data ? (
                <Spinner />
            ) : data.length === 0 ? (
                <div className="card">
                    {tab === 'active' ? (
                        <EmptyState
                            icon={ClipboardList}
                            title="No active assignments"
                            text="Assign a staff member to a client so they can start duty."
                            action={
                                <button className="btn-primary" onClick={() => setForm({ open: true, assignment: null })}>
                                    <Plus size={18} /> Assign staff
                                </button>
                            }
                        />
                    ) : (
                        <EmptyState icon={History} title="No closed assignments yet" text="When you close an assignment, it is kept here with its full work record." />
                    )}
                </div>
            ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                    {data.map((a) =>
                        a.status === 'closed' ? (
                            <div key={a.id} className="card bg-slate-50/50 p-4">
                                <People a={a} />
                                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                            <CheckCircle2 size={15} className="text-slate-400" /> Work finished on {formatDate(a.closed_at)}
                                        </p>
                                        <span className="text-xs text-slate-400">
                                            {formatDate(a.start_date, { year: undefined })} - {formatDate(a.closed_at)}
                                        </span>
                                    </div>
                                    {a.close_note && <p className="mt-1 text-xs text-slate-500">"{a.close_note}"</p>}
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-lg bg-slate-50 py-2">
                                            <p className="text-[11px] font-semibold text-slate-400">SHIFTS</p>
                                            <p className="font-bold text-slate-900">{a.shifts_count}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 py-2">
                                            <p className="text-[11px] font-semibold text-slate-400">STAFF PAY</p>
                                            <p className="font-bold text-slate-900">{formatMoney(a.staff_total)}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 py-2">
                                            <p className="text-[11px] font-semibold text-slate-400">CHARGED</p>
                                            <p className="font-bold text-emerald-700">{formatMoney(a.client_total)}</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        {a.shift_hours ? `${shiftLabel(a.shift_hours, a.shift_type)} · ` : ''}
                                        {a.staff_rate ? `Pay ${formatMoney(a.staff_rate)} · Charge ${formatMoney(a.client_rate)} per shift` : ''}
                                    </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <StatusBadge status="completed" label="Closed" />
                                    <div className="flex gap-1">
                                        <Link to={`/admin/attendance?staff_id=${a.staff_id}&client_id=${a.client_id}`} className="btn-ghost px-2.5 py-1.5 text-xs">
                                            <CalendarDays size={14} /> Duties
                                        </Link>
                                        <button className="btn-ghost px-2.5 py-1.5 text-xs text-brand-700" onClick={() => reopen(a)}>
                                            <RotateCcw size={14} /> Reopen
                                        </button>
                                        <button className="btn-ghost px-2 py-1.5 text-rose-600 hover:bg-rose-50" onClick={() => setToDelete(a)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div key={a.id} className="card p-4">
                                <People a={a} />
                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={13} className="text-slate-400" />
                                        {a.shift_hours ? <b className="text-slate-700">{shiftLabel(a.shift_hours, a.shift_type, { short: true })}</b> : null} {formatShift(a.shift_start, a.shift_end)}
                                    </span>
                                    {a.staff_rate ? (
                                        <span>
                                            Pay <b className="text-slate-700">{formatMoney(a.staff_rate)}</b> · Charge <b className="text-slate-700">{formatMoney(a.client_rate)}</b>
                                            <span className="text-emerald-600"> (+{formatMoney(a.client_rate - a.staff_rate)})</span>
                                        </span>
                                    ) : (
                                        <span className="font-semibold text-amber-600">Shift rate not set</span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <CalendarDays size={13} className="text-slate-400" /> Since {formatDate(a.start_date)} · {a.shifts_count} shifts done
                                    </span>
                                </div>
                                {a.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{a.notes}</p>}
                                <div className="mt-3 flex items-center justify-between">
                                    <StatusBadge status="active" label="Assigned" />
                                    <div className="flex gap-1">
                                        <button className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => setForm({ open: true, assignment: a })}>
                                            <Pencil size={14} /> Edit
                                        </button>
                                        <button className="btn-ghost px-2.5 py-1.5 text-xs text-[#128c4b] hover:bg-emerald-50" onClick={() => setSharing(a)}>
                                            <Share2 size={14} /> Share
                                        </button>
                                        <button className="btn-ghost px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50" onClick={() => setClosing(a)}>
                                            <CheckCircle2 size={14} /> Close
                                        </button>
                                        <button className="btn-ghost px-2 py-1.5 text-rose-600 hover:bg-rose-50" onClick={() => setToDelete(a)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}

            <AssignmentForm open={form.open} assignment={form.assignment} onClose={() => setForm({ open: false, assignment: null })} onSaved={() => reload(true)} />
            <AssignmentShare assignment={sharing} open={!!sharing} onClose={() => setSharing(null)} />
            <CloseAssignmentModal assignment={closing} onClose={() => setClosing(null)} onSaved={() => reload(true)} />
            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={remove}
                loading={busy}
                title="Delete this assignment?"
                message={
                    toDelete &&
                    `This permanently deletes the assignment of ${toDelete.staff?.name} to ${toDelete.client?.name}. Duty records stay in Attendance. Tip: use "Close" instead to keep it in history.`
                }
                confirmText="Delete"
            />
        </>
    );
}

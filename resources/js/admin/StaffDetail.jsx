import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, CalendarDays, Clock, IndianRupee, MapPin, Pencil, Phone, Plus, Share2, Trash2, Wallet } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, formatShift, formatTime, shiftLabel } from '../lib/format';
import { Avatar, ConfirmDialog, EmptyState, Spinner, StatCard, StatusBadge, useToast } from '../components/ui';
import StaffProfileView from './StaffProfileView';
import CheckInPhoto from './CheckInPhoto';
import PayslipShareButton from '../components/PayslipShareButton';
import AssignmentForm from './AssignmentForm';
import CloseAssignmentModal from './CloseAssignmentModal';
import AssignmentShare from '../components/AssignmentShare';
import PayoutForm from './PayoutForm';

export default function StaffDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { data: s, loading, reload } = useFetch(`/admin/staff/${id}`);
    const [showProfile, setShowProfile] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [editAsg, setEditAsg] = useState(null);
    const [closingAsg, setClosingAsg] = useState(null);
    const [sharing, setSharing] = useState(null);
    const [payOpen, setPayOpen] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!s) return <Spinner />;

    const remove = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/staff/${id}`);
            toast('Staff deleted');
            navigate('/admin/staff');
        } catch (e) {
            toast(errorMessage(e), 'error');
            setDeleting(false);
        }
    };


    return (
        <div className="space-y-5">
            <Link to="/admin/staff" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft size={16} /> All staff
            </Link>

            <div className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <Avatar name={s.name} size="xl" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-slate-900">{s.name}</h1>
                            <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
                        </div>
                        <p className="font-medium text-brand-700">{s.designation || 'Staff'}</p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                            <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 hover:text-brand-700">
                                <Phone size={15} /> {s.phone}
                            </a>
                            {s.joining_date && (
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays size={15} /> Joined {formatDate(s.joining_date)}
                                </span>
                            )}
                            {s.city && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={15} /> {s.city}
                                </span>
                            )}
                            {s.address && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin size={15} /> {s.address}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/admin/staff/${s.id}/edit`} className="btn-secondary">
                            <Pencil size={16} /> Edit
                        </Link>
                        <button className="btn-secondary text-rose-600" onClick={() => setConfirm(true)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {s.current && (
                    <div className={`mt-5 flex flex-wrap items-center gap-3 rounded-2xl p-4 ${s.current.status === 'on_break' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                        <StatusBadge status={s.current.status} />
                        <p className="text-sm text-slate-700">
                            Started at <b>{formatTime(s.current.clock_in)}</b>
                            {s.current.client && (
                                <>
                                    {' '}at <b>{s.current.client.name}</b>
                                </>
                            )}{' '}
                            · {formatMinutes(s.current.live_worked_minutes)} worked
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard icon={Clock} label="Hours this month" value={formatMinutes(s.stats.month_minutes)} />
                <StatCard icon={CalendarDays} label="Days worked" value={s.stats.month_days} tone="sky" sub="This month" />
                <StatCard icon={Briefcase} label="Total hours" value={formatMinutes(s.stats.total_minutes)} tone="violet" sub="All time" />
                <StatCard
                    icon={IndianRupee}
                    label="Earned this month"
                    value={formatMoney(s.finance.month_earned)}
                    tone="green"
                    sub="Per-shift pay from assignments"
                />
            </div>

            <div>
                <button onClick={() => setShowProfile(!showProfile)} className="btn-secondary w-full justify-between">
                    <span>Full profile, bank details & documents</span>
                    <span className="text-xs text-brand-700">{showProfile ? 'Hide' : 'Show'}</span>
                </button>
                {showProfile && (
                    <div className="mt-4">
                        <StaffProfileView staff={s} />
                    </div>
                )}
            </div>

            <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-bold text-slate-900">Payments</h2>
                        <p className="text-xs text-slate-400">Total paid {formatMoney(s.finance.paid_total)}</p>
                    </div>
                    <button className="btn-primary" onClick={() => setPayOpen(true)} disabled={!s.finance.unsettled}>
                        <Wallet size={16} /> Pay {formatMoney(s.finance.unsettled)}
                    </button>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 text-center">
                    <div className="p-3">
                        <p className="text-[11px] font-semibold text-slate-400">EARNED, NOT PAID</p>
                        <p className="text-lg font-extrabold text-amber-600">{formatMoney(s.finance.unsettled)}</p>
                    </div>
                    <div className="p-3">
                        <p className="text-[11px] font-semibold text-slate-400">PENDING PAYOUTS</p>
                        <p className="text-lg font-extrabold text-sky-600">{formatMoney(s.finance.processing)}</p>
                    </div>
                </div>
                {s.payouts_list.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">No payments made yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {s.payouts_list.map((p) => (
                            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatDate(p.period_from, { year: undefined })} - {formatDate(p.period_to)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatMinutes(p.minutes)}
                                        {p.status === 'paid' && ` · Paid ${formatDate(p.paid_at)}${p.payment_method ? ` via ${p.payment_method}` : ''}`}
                                    </p>
                                </div>
                                <span className="font-bold text-slate-900">{formatMoney(p.amount)}</span>
                                <StatusBadge status={p.status === 'paid' ? 'active' : 'on_break'} label={p.status === 'paid' ? 'Paid' : 'Pending'} />
                                <PayslipShareButton payoutId={p.id} admin staffName={s.name} className="btn-ghost px-2 py-1 text-xs text-[#128c4b]" />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">Assigned clients</h2>
                        <button className="btn-ghost -mr-2 px-3 py-1.5 text-brand-700" onClick={() => setAssignOpen(true)}>
                            <Plus size={16} /> Assign
                        </button>
                    </div>
                    {s.assignments.length === 0 ? (
                        <EmptyState title="No clients assigned" text="Assign a client so this staff can start duty." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {[...s.assignments].sort((x, y) => (x.status === 'closed') - (y.status === 'closed')).map((a) => (
                                <li key={a.id} className={`px-5 py-3.5 ${a.status === 'closed' ? 'bg-slate-50/70 opacity-75' : ''}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <Link to={`/admin/clients/${a.client_id}`} className="truncate font-semibold text-slate-800 hover:text-brand-700">
                                            {a.client?.name}
                                        </Link>
                                        {a.status === 'closed' ? (
                                            <StatusBadge status="completed" label={`Closed ${formatDate(a.closed_at, { year: undefined })}`} />
                                        ) : (
                                            <div className="flex shrink-0 gap-1">
                                                <button className="btn-ghost px-2 py-1 text-xs text-[#128c4b]" onClick={() => setSharing({ ...a, staff: s })} title="Share on WhatsApp">
                                                    <Share2 size={13} />
                                                </button>
                                                <button className="btn-ghost px-2 py-1 text-xs text-brand-700" onClick={() => setEditAsg(a)}>
                                                    <Pencil size={13} /> Edit
                                                </button>
                                                <button className="btn-ghost px-2 py-1 text-xs text-amber-700" onClick={() => setClosingAsg({ ...a, staff: s })}>
                                                    Close
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {a.shift_hours ? `${shiftLabel(a.shift_hours, a.shift_type)} · ` : ''}
                                        {formatShift(a.shift_start, a.shift_end)} · Since {formatDate(a.start_date)}
                                    </p>
                                    <p className="mt-0.5 text-xs">
                                        {a.staff_rate ? (
                                            <span className="font-semibold text-slate-700">
                                                Pay {formatMoney(a.staff_rate)}/shift · Charge {formatMoney(a.client_rate)}/shift
                                            </span>
                                        ) : (
                                            <span className="font-semibold text-amber-600">Shift rate not set</span>
                                        )}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card lg:col-span-3">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">Recent duties</h2>
                        <Link to={`/admin/attendance?staff_id=${s.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                            Full report
                        </Link>
                    </div>
                    {s.recent_attendance.length === 0 ? (
                        <EmptyState icon={Clock} title="No duties yet" />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Selfie</th>
                                        <th>Client</th>
                                        <th>Time</th>
                                        <th>Worked</th>
                                        <th>Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.recent_attendance.map((a) => (
                                        <tr key={a.id}>
                                            <td className="font-medium">{formatDate(a.duty_date, { year: undefined })}</td>
                                            <td>
                                                <CheckInPhoto attendance={{ ...a, staff: s }} />
                                            </td>
                                            <td className="text-slate-600">{a.client?.name || '-'}</td>
                                            <td className="text-slate-600">
                                                {formatTime(a.clock_in)} - {a.clock_out ? formatTime(a.clock_out) : <StatusBadge status={a.status} />}
                                            </td>
                                            <td className="font-bold text-slate-900">{formatMinutes(a.live_worked_minutes)}</td>
                                            <td className="text-slate-700">{formatMoney(a.live_staff_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <PayoutForm open={payOpen} onClose={() => setPayOpen(false)} preset={{ staff_id: s.id, from: '2000-01-01' }} onSaved={() => reload(true)} />
            <AssignmentForm open={assignOpen} onClose={() => setAssignOpen(false)} preset={{ staff_id: s.id }} onSaved={() => reload(true)} />
            <AssignmentForm open={!!editAsg} assignment={editAsg} onClose={() => setEditAsg(null)} onSaved={() => reload(true)} />
            <AssignmentShare assignment={sharing} open={!!sharing} onClose={() => setSharing(null)} />
            <CloseAssignmentModal assignment={closingAsg} onClose={() => setClosingAsg(null)} onSaved={() => reload(true)} />
            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={deleting}
                title="Delete staff?"
                message={`${s.name} and all their attendance records will be permanently deleted. You can mark them inactive instead to keep history.`}
            />
        </div>
    );
}

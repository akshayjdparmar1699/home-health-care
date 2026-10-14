import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, FilePlus2, HeartHandshake, MapPin, Navigation, Pencil, Phone, Plus, ReceiptText, Share2, ShieldAlert, Stethoscope, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, formatShift, formatTime, directionsLink, shiftLabel } from '../lib/format';
import { Avatar, ConfirmDialog, EmptyState, Spinner, StatusBadge, useToast } from '../components/ui';
import ClientForm from './ClientForm';
import AssignmentForm from './AssignmentForm';
import CloseAssignmentModal from './CloseAssignmentModal';
import AssignmentShare from '../components/AssignmentShare';
import CheckInPhoto from './CheckInPhoto';
import ClientVisits from './ClientVisits';

export default function ClientDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { data: c, loading, reload } = useFetch(`/admin/clients/${id}`);
    const [editOpen, setEditOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [editAsg, setEditAsg] = useState(null);
    const [closingAsg, setClosingAsg] = useState(null);
    const [sharing, setSharing] = useState(null);
    const [confirm, setConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (!c) return <Spinner />;

    const remove = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/clients/${id}`);
            toast('Client deleted');
            navigate('/admin/clients');
        } catch (e) {
            toast(errorMessage(e), 'error');
            setDeleting(false);
        }
    };

    const fullAddress = [c.address, c.city, c.pincode].filter(Boolean).join(', ');

    return (
        <div className="space-y-5">
            <Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft size={16} /> All clients
            </Link>

            <div className="card p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <Avatar name={c.name} size="xl" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-slate-900">{c.name}</h1>
                            <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                            {c.source === 'self' && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">Filled by client</span>}
                        </div>
                        <p className="text-slate-500">
                            {[c.age && `${c.age} years`, c.gender && c.gender[0].toUpperCase() + c.gender.slice(1)].filter(Boolean).join(' · ')}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.service_type && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                    <HeartHandshake size={13} /> {c.service_type}
                                </span>
                            )}
                        </div>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <a href={`tel:${c.relative_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-700">
                                <Phone size={16} className="text-slate-400" /> {c.relative_phone}
                                {c.relative_name && <span className="text-slate-400">({c.relative_name})</span>}
                            </a>
                            <a href={directionsLink(c)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-slate-600 hover:text-brand-700">
                                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" /> {fullAddress}
                            </a>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <a href={directionsLink(c)} target="_blank" rel="noreferrer" className="btn-secondary">
                            <Navigation size={16} /> Map
                        </a>
                        <button className="btn-secondary" onClick={() => setEditOpen(true)}>
                            <Pencil size={16} /> Edit
                        </button>
                        <button className="btn-secondary text-rose-600" onClick={() => setConfirm(true)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-sky-50 p-4">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
                            <Stethoscope size={14} /> Medical notes
                        </p>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{c.medical_notes || 'No notes added'}</p>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-4">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                            <ShieldAlert size={14} /> Emergency contact
                        </p>
                        {c.emergency_contact_phone ? (
                            <a href={`tel:${c.emergency_contact_phone}`} className="mt-1.5 block text-sm text-slate-700">
                                <b>{c.emergency_contact_name || 'Contact'}</b> · {c.emergency_contact_phone}
                            </a>
                        ) : (
                            <p className="mt-1.5 text-sm text-slate-500">Not added</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="font-bold text-slate-900">Bills</h2>
                        <p className="text-xs text-slate-400">Total received {formatMoney(c.finance.paid_total)}</p>
                    </div>
                    <Link to={`/admin/billing/new?client_id=${c.id}&from=2000-01-01`} className="btn-primary">
                        <FilePlus2 size={16} /> Create bill
                    </Link>
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 text-center">
                    <div className="p-3">
                        <p className="text-[11px] font-semibold text-slate-400">NOT BILLED YET</p>
                        <p className="text-lg font-extrabold text-amber-600">{formatMoney(c.finance.unbilled)}</p>
                        <p className="text-[11px] text-slate-400">
                            {[c.finance.unbilled_minutes > 0 && formatMinutes(c.finance.unbilled_minutes), c.finance.unbilled_visits > 0 && `visits ${formatMoney(c.finance.unbilled_visits)}`]
                                .filter(Boolean)
                                .join(' + ') || formatMinutes(0)}
                        </p>
                    </div>
                    <div className="p-3">
                        <p className="text-[11px] font-semibold text-slate-400">BILLED, UNPAID</p>
                        <p className="text-lg font-extrabold text-sky-600">{formatMoney(c.finance.billed_unpaid)}</p>
                    </div>
                </div>
                {c.invoices_list.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-slate-400">No bills yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {c.invoices_list.map((inv) => (
                            <li key={inv.id}>
                                <Link to={`/admin/billing/${inv.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70">
                                    <ReceiptText size={18} className="text-brand-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{inv.invoice_no}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(inv.period_from, { year: undefined })} - {formatDate(inv.period_to)}
                                        </p>
                                    </div>
                                    <span className="font-bold text-slate-900">{formatMoney(inv.total)}</span>
                                    <StatusBadge status={inv.status === 'paid' ? 'active' : 'cancelled'} label={inv.status === 'paid' ? 'Paid' : 'Unpaid'} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ClientVisits client={c} onChanged={() => reload(true)} />

            <div className="grid gap-5 lg:grid-cols-5">
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">Care team</h2>
                        <button className="btn-ghost -mr-2 px-3 py-1.5 text-brand-700" onClick={() => setAssignOpen(true)}>
                            <Plus size={16} /> Assign staff
                        </button>
                    </div>
                    {c.assignments.length === 0 ? (
                        <EmptyState title="No staff assigned" text="Assign a nurse or caretaker to this client." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {[...c.assignments].sort((x, y) => (x.status === 'closed') - (y.status === 'closed')).map((a) => (
                                <li key={a.id} className={`flex items-center gap-3 px-5 py-3.5 ${a.status === 'closed' ? 'bg-slate-50/70 opacity-75' : ''}`}>
                                    <Avatar name={a.staff?.name} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <Link to={`/admin/staff/${a.staff_id}`} className="block truncate font-semibold text-slate-800 hover:text-brand-700">
                                            {a.staff?.name}
                                        </Link>
                                        <p className="truncate text-xs text-slate-500">
                                            {a.shift_hours ? shiftLabel(a.shift_hours, a.shift_type) : formatShift(a.shift_start, a.shift_end)}
                                            {a.client_rate ? ` · ${formatMoney(a.client_rate)}/shift` : ' · Rate not set'}
                                        </p>
                                    </div>
                                    {a.status === 'closed' ? (
                                        <StatusBadge status="completed" label={`Closed ${formatDate(a.closed_at, { year: undefined })}`} />
                                    ) : (
                                        <div className="flex shrink-0 gap-1">
                                            <button className="btn-ghost px-2 py-1 text-xs text-[#128c4b]" onClick={() => setSharing({ ...a, client: c })} title="Share on WhatsApp">
                                                <Share2 size={13} />
                                            </button>
                                            <button className="btn-ghost px-2 py-1 text-xs text-brand-700" onClick={() => setEditAsg(a)}>
                                                <Pencil size={13} /> Edit
                                            </button>
                                            <button className="btn-ghost px-2 py-1 text-xs text-amber-700" onClick={() => setClosingAsg({ ...a, client: c })}>
                                                Close
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card lg:col-span-3">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-slate-900">Visit log</h2>
                            <p className="text-xs text-slate-400">{formatMinutes(c.month_minutes)} of care this month</p>
                        </div>
                        <Link to={`/admin/attendance?client_id=${c.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                            Full report
                        </Link>
                    </div>
                    {c.recent_attendance.length === 0 ? (
                        <EmptyState icon={Clock} title="No visits yet" />
                    ) : (
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Selfie</th>
                                        <th>Staff</th>
                                        <th>Time</th>
                                        <th>Worked</th>
                                        <th>Charge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {c.recent_attendance.map((a) => (
                                        <tr key={a.id}>
                                            <td className="font-medium">{formatDate(a.duty_date, { year: undefined })}</td>
                                            <td>
                                                <CheckInPhoto attendance={{ ...a, client: c }} />
                                            </td>
                                            <td className="text-slate-600">{a.staff?.name}</td>
                                            <td className="text-slate-600">
                                                {formatTime(a.clock_in)} - {a.clock_out ? formatTime(a.clock_out) : <StatusBadge status={a.status} />}
                                            </td>
                                            <td className="font-bold text-slate-900">{formatMinutes(a.live_worked_minutes)}</td>
                                            <td className="text-slate-700">{formatMoney(a.live_client_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <ClientForm open={editOpen} onClose={() => setEditOpen(false)} client={c} onSaved={() => reload(true)} />
            <AssignmentForm open={assignOpen} onClose={() => setAssignOpen(false)} preset={{ client_id: c.id }} onSaved={() => reload(true)} />
            <AssignmentForm open={!!editAsg} assignment={editAsg} onClose={() => setEditAsg(null)} onSaved={() => reload(true)} />
            <AssignmentShare assignment={sharing} open={!!sharing} onClose={() => setSharing(null)} />
            <CloseAssignmentModal assignment={closingAsg} onClose={() => setClosingAsg(null)} onSaved={() => reload(true)} />
            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={deleting}
                title="Delete client?"
                message={`${c.name} and all their assignments will be deleted. Attendance history stays but without the client name.`}
            />
        </div>
    );
}

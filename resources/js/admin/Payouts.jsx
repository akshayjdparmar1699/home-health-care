import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, Trash2, Wallet } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney } from '../lib/format';
import { Avatar, ConfirmDialog, EmptyState, Field, Modal, PageHeader, Spinner, StatCard, StatusBadge, useToast } from '../components/ui';
import PayoutForm, { PAYMENT_METHODS } from './PayoutForm';
import PayslipShareButton from '../components/PayslipShareButton';

function MarkPaidModal({ payout, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ payment_method: 'UPI', reference: '' });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            await api.put(`/admin/payouts/${payout.id}`, { status: 'paid', ...form });
            toast('Marked as paid');
            onSaved();
            onClose();
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={!!payout}
            onClose={onClose}
            size="sm"
            title="Mark as paid"
            subtitle={payout && `${payout.staff?.name} · ${formatMoney(payout.amount)}`}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={submit} disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} Confirm paid
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-2 gap-3">
                <Field label="Method">
                    <select className="input" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                        {PAYMENT_METHODS.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Reference / UTR">
                    <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </Field>
            </div>
        </Modal>
    );
}

export default function Payouts() {
    const toast = useToast();
    const [status, setStatus] = useState('');
    const [form, setForm] = useState({ open: false, preset: {} });
    const [marking, setMarking] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { data, loading, reload } = useFetch('/admin/payouts', { status });

    const remove = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/payouts/${toDelete.id}`);
            toast('Payout deleted. Duties are unpaid again.');
            setToDelete(null);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Staff Payments"
                subtitle="Pay staff for their duty hours"
                action={
                    <button className="btn-primary" onClick={() => setForm({ open: true, preset: {} })}>
                        <Wallet size={18} /> Pay staff
                    </button>
                }
            />

            {!data ? (
                <Spinner />
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        <StatCard icon={Clock} label="Earned, not paid yet" value={formatMoney(data.summary.unsettled)} tone="amber" sub="Completed duties" />
                        <StatCard icon={Wallet} label="Pending payouts" value={formatMoney(data.summary.pending)} tone="sky" sub="Created, not paid" />
                        <StatCard icon={CheckCircle2} label="Paid this month" value={formatMoney(data.summary.paid_this_month)} tone="green" />
                    </div>

                    <div className="card">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">To be paid</h2>
                            <p className="text-xs text-slate-400">Duty hours not included in any payment yet</p>
                        </div>
                        {data.unsettled.length === 0 ? (
                            <EmptyState icon={CheckCircle2} title="All staff are paid up" />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {data.unsettled.map((u) => (
                                    <li key={u.staff_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                                        <Avatar name={u.staff?.name} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <Link to={`/admin/staff/${u.staff_id}`} className="block truncate font-semibold text-slate-800 hover:text-brand-700">
                                                {u.staff?.name}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {u.sessions} duties · {formatMinutes(u.minutes)} · {formatDate(u.from, { year: undefined })} to {formatDate(u.to, { year: undefined })}
                                            </p>
                                        </div>
                                        <p className="text-lg font-extrabold text-slate-900">{formatMoney(u.amount)}</p>
                                        <button className="btn-primary px-3 py-2" onClick={() => setForm({ open: true, preset: { staff_id: u.staff_id, from: u.from, to: u.to } })}>
                                            Pay
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">Payment history</h2>
                            <div className="flex rounded-xl bg-slate-100 p-1">
                                {[
                                    ['', 'All'],
                                    ['pending', 'Pending'],
                                    ['paid', 'Paid'],
                                ].map(([v, l]) => (
                                    <button
                                        key={l}
                                        onClick={() => setStatus(v)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${status === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {data.payouts.length === 0 ? (
                            <EmptyState icon={Wallet} title="No payments yet" />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {data.payouts.map((p) => (
                                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                                        <Avatar name={p.staff?.name} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-800">{p.staff?.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatDate(p.period_from, { year: undefined })} - {formatDate(p.period_to)} · {formatMinutes(p.minutes)}
                                                {p.adjustment !== 0 && ` · ${p.adjustment > 0 ? '+' : ''}${formatMoney(p.adjustment)} adj.`}
                                            </p>
                                            {p.status === 'paid' && (
                                                <p className="text-xs text-emerald-700">
                                                    Paid {formatDate(p.paid_at)} {p.payment_method && `via ${p.payment_method}`} {p.reference && `(${p.reference})`}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-lg font-extrabold text-slate-900">{formatMoney(p.amount)}</p>
                                        <StatusBadge status={p.status === 'paid' ? 'active' : 'on_break'} label={p.status === 'paid' ? 'Paid' : 'Pending'} />
                                        <div className="flex gap-1">
                                            {p.status === 'pending' && (
                                                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setMarking(p)}>
                                                    Mark paid
                                                </button>
                                            )}
                                            <PayslipShareButton payoutId={p.id} admin staffName={p.staff?.name} className="btn-secondary px-3 py-1.5 text-xs text-[#128c4b]" label="Slip / Share" />
                                            <button className="btn-ghost px-2 py-1.5 text-rose-600 hover:bg-rose-50" onClick={() => setToDelete(p)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <PayoutForm open={form.open} preset={form.preset} onClose={() => setForm({ open: false, preset: {} })} onSaved={() => reload(true)} />
            <MarkPaidModal payout={marking} onClose={() => setMarking(null)} onSaved={() => reload(true)} />
            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={remove}
                loading={deleting}
                title="Delete this payment?"
                message="The duties in this payment will become unpaid again and can be paid in a new payment."
            />
        </>
    );
}

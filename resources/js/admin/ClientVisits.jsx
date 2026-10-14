import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Loader2, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { formatDate, formatMoney, todayISO } from '../lib/format';
import { ConfirmDialog, EmptyState, Field, Modal, useToast } from '../components/ui';

function VisitModal({ open, onClose, clientId, visit, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ visit_date: todayISO(), amount: '', description: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setForm(visit ? { visit_date: visit.visit_date, amount: String(visit.amount), description: visit.description } : { visit_date: todayISO(), amount: '', description: '' });
    }, [open, visit]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            if (visit) await api.put(`/admin/visits/${visit.id}`, form);
            else await api.post(`/admin/clients/${clientId}/visits`, form);
            toast(visit ? 'Visit updated' : 'Visit added. It will be on the next bill.');
            onSaved();
            onClose();
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])));
            } else toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title={visit ? 'Edit visit' : 'Add visit'}
            subtitle="Charged on the client's next bill"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="visit-form" className="btn-primary" disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} {visit ? 'Save' : 'Add visit'}
                    </button>
                </>
            }
        >
            <form id="visit-form" onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Date *" error={errors.visit_date}>
                        <input type="date" className="input" value={form.visit_date} max={todayISO()} onChange={set('visit_date')} required />
                    </Field>
                    <Field label="Amount (₹) *" error={errors.amount}>
                        <input type="number" min="0" step="any" inputMode="decimal" className="input" value={form.amount} onChange={set('amount')} required placeholder="500" />
                    </Field>
                </div>
                <Field label="Description *" error={errors.description}>
                    <input className="input" value={form.description} onChange={set('description')} maxLength={255} required placeholder="e.g. Home visit, dressing change" />
                </Field>
                {errors.visit && <p className="text-xs font-medium text-rose-600">{errors.visit}</p>}
            </form>
        </Modal>
    );
}

/** "Visits" card on the client page: visit charges that go on the bill with the staff duties. */
export default function ClientVisits({ client, onChanged }) {
    const toast = useToast();
    const [editing, setEditing] = useState(null); // null = closed, {} = new, visit = edit
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const visits = client.visit_charges || [];
    const unbilled = visits.filter((v) => !v.invoice_id);

    const remove = async () => {
        setDeleting(true);
        try {
            await api.delete(`/admin/visits/${toDelete.id}`);
            toast('Visit deleted');
            setToDelete(null);
            onChanged();
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                    <h2 className="font-bold text-slate-900">Visits</h2>
                    <p className="text-xs text-slate-400">
                        {unbilled.length > 0
                            ? `${formatMoney(unbilled.reduce((s, v) => s + v.amount, 0))} not billed yet · added to the next bill`
                            : 'Visit charges are added to the bill with the staff duties'}
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setEditing({})}>
                    <Plus size={16} /> Add visit
                </button>
            </div>

            {visits.length === 0 ? (
                <EmptyState icon={CalendarPlus} title="No visits yet" text="Add a visit with its date, amount and description." />
            ) : (
                <ul className="divide-y divide-slate-100">
                    {visits.map((v) => (
                        <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                            <div className="w-14 shrink-0 rounded-xl bg-slate-50 py-1.5 text-center">
                                <p className="text-sm font-extrabold leading-none text-slate-800">{new Date(v.visit_date + 'T00:00:00').getDate()}</p>
                                <p className="mt-0.5 text-[10px] font-semibold uppercase text-slate-400">{formatDate(v.visit_date, { day: undefined, year: '2-digit' })}</p>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{v.description}</p>
                                {v.invoice ? (
                                    <Link to={`/admin/billing/${v.invoice.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                                        <ReceiptText size={12} /> On bill {v.invoice.invoice_no}
                                    </Link>
                                ) : (
                                    <p className="text-xs font-semibold text-amber-600">Not billed yet</p>
                                )}
                            </div>
                            <p className="shrink-0 font-bold text-slate-900">{formatMoney(v.amount)}</p>
                            {!v.invoice_id && (
                                <div className="flex shrink-0">
                                    <button className="btn-ghost px-2 py-1" onClick={() => setEditing(v)} title="Edit">
                                        <Pencil size={14} />
                                    </button>
                                    <button className="btn-ghost px-2 py-1 text-rose-600" onClick={() => setToDelete(v)} title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <VisitModal open={!!editing} visit={editing?.id ? editing : null} clientId={client.id} onClose={() => setEditing(null)} onSaved={onChanged} />
            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={remove}
                loading={deleting}
                title="Delete visit?"
                message={toDelete ? `${toDelete.description} (${formatMoney(toDelete.amount)}) will be removed.` : ''}
            />
        </div>
    );
}

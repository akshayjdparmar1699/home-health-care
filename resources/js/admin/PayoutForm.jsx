import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { formatDate, formatMinutes, formatMoney, shiftLabel, todayISO } from '../lib/format';
import { Field, Modal, Toggle, useToast } from '../components/ui';

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

/** Create a staff payout for unpaid duties in a period. */
export default function PayoutForm({ open, onClose, preset = {}, onSaved }) {
    const toast = useToast();
    const [staff, setStaff] = useState([]);
    const [form, setForm] = useState({});
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setPreview(null);
        setForm({
            staff_id: preset.staff_id || '',
            from: preset.from || todayISO().slice(0, 8) + '01',
            to: preset.to || todayISO(),
            adjustment: '',
            notes: '',
            mark_paid: true,
            payment_method: 'UPI',
            reference: '',
        });
        api.get('/admin/staff').then((r) => setStaff(r.data));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open || !form.staff_id || !form.from || !form.to) return setPreview(null);
        setLoadingPreview(true);
        const t = setTimeout(() => {
            api.get('/admin/payouts/preview', { params: { staff_id: form.staff_id, from: form.from, to: form.to } })
                .then((r) => setPreview(r.data))
                .catch(() => setPreview(null))
                .finally(() => setLoadingPreview(false));
        }, 250);
        return () => clearTimeout(t);
    }, [open, form.staff_id, form.from, form.to]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const adjustment = Number(form.adjustment || 0);
    const total = Math.max(0, (preview?.earned || 0) + adjustment);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/admin/payouts', { ...form, adjustment: adjustment || 0 });
            toast(form.mark_paid ? 'Payment recorded. Staff can see it now.' : 'Payout created as pending');
            onSaved?.();
            onClose();
        } catch (err) {
            toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Pay staff"
            subtitle="Settle unpaid duty hours for a period"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="payout-form" className="btn-primary" disabled={saving || !preview?.sessions}>
                        {saving && <Loader2 size={16} className="animate-spin" />}
                        {form.mark_paid ? `Pay ${formatMoney(total)}` : 'Create pending payout'}
                    </button>
                </>
            }
        >
            <form id="payout-form" onSubmit={submit} className="space-y-4">
                <Field label="Staff *">
                    <select className="input" value={form.staff_id || ''} onChange={set('staff_id')} required disabled={!!preset.staff_id}>
                        <option value="">Select staff</option>
                        {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} {s.designation ? `(${s.designation})` : ''}
                            </option>
                        ))}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="From">
                        <input type="date" className="input" value={form.from || ''} onChange={set('from')} required />
                    </Field>
                    <Field label="To">
                        <input type="date" className="input" value={form.to || ''} onChange={set('to')} required />
                    </Field>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                    {!form.staff_id ? (
                        <p className="text-sm text-slate-500">Select a staff member to see unpaid duties.</p>
                    ) : loadingPreview && !preview ? (
                        <Loader2 className="mx-auto animate-spin text-brand-600" />
                    ) : !preview?.sessions ? (
                        <p className="text-sm font-medium text-amber-700">No unpaid shifts in this period.</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400">SHIFTS</p>
                                    <p className="font-bold text-slate-900">{preview.sessions}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400">HOURS</p>
                                    <p className="font-bold text-slate-900">{formatMinutes(preview.minutes)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400">EARNED</p>
                                    <p className="font-bold text-slate-900">{formatMoney(preview.earned)}</p>
                                </div>
                            </div>
                            <details className="mt-3">
                                <summary className="cursor-pointer text-xs font-semibold text-brand-700">Show duties</summary>
                                <ul className="mt-2 max-h-40 divide-y divide-slate-200 overflow-y-auto text-xs">
                                    {preview.records.map((r) => (
                                        <li key={r.id} className="flex justify-between py-1.5">
                                            <span className="text-slate-600">
                                                {formatDate(r.duty_date, { year: undefined })} · {r.client || 'No client'} · {r.shift_hours ? shiftLabel(r.shift_hours, r.shift_type) : formatMinutes(r.worked_minutes)}
                                            </span>
                                            <span className="font-semibold">{formatMoney(r.staff_amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        </>
                    )}
                </div>

                <Field label="Bonus (+) / Deduction (-)" hint="e.g. 500 for bonus, -200 for advance already given">
                    <input type="number" step="0.01" className="input" value={form.adjustment || ''} onChange={set('adjustment')} placeholder="0" />
                </Field>

                {preview?.sessions > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
                        <span className="text-sm font-semibold text-brand-800">Total to pay</span>
                        <span className="text-xl font-extrabold text-brand-800">{formatMoney(total)}</span>
                    </div>
                )}

                <Toggle checked={!!form.mark_paid} onChange={(v) => setForm({ ...form, mark_paid: v })} label="Mark as paid now" />
                {form.mark_paid && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Payment method">
                            <select className="input" value={form.payment_method} onChange={set('payment_method')}>
                                {PAYMENT_METHODS.map((m) => (
                                    <option key={m}>{m}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Reference / UTR">
                            <input className="input" value={form.reference} onChange={set('reference')} placeholder="Optional" />
                        </Field>
                    </div>
                )}
                <Field label="Note">
                    <input className="input" value={form.notes || ''} onChange={set('notes')} placeholder="Optional, visible to staff" />
                </Field>
            </form>
        </Modal>
    );
}

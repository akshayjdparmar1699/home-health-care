import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { formatDate, formatMinutes, formatMoney, formatTime, shiftLabel } from '../lib/format';
import { Field, Modal, useToast } from '../components/ui';
import { CheckInCell } from './CheckInPhoto';

/** Approve a finished duty's payment, optionally changing the staff pay / client charge first. */
export default function ApproveDutyModal({ record, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ staff_amount: '', client_amount: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (record) setForm({ staff_amount: String(record.staff_amount ?? 0), client_amount: String(record.client_amount ?? 0) });
    }, [record]);

    if (!record) return null;

    const pay = Number(form.staff_amount || 0);
    const charge = Number(form.client_amount || 0);
    const changed = pay !== Number(record.staff_amount) || charge !== Number(record.client_amount);

    const submit = async () => {
        setSaving(true);
        try {
            await api.post(`/admin/attendance/${record.id}/approve`, { staff_amount: pay, client_amount: charge });
            toast(`Approved. ${record.staff?.name || 'Staff'} can now see ${formatMoney(pay)} in earnings.`);
            onSaved?.();
            onClose();
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={!!record}
            onClose={onClose}
            size="sm"
            title="Approve duty payment"
            subtitle={`${record.staff?.name || 'Staff'} · ${formatDate(record.duty_date)}${record.client ? ` · ${record.client.name}` : ''}`}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Later
                    </button>
                    <button className="btn-primary" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {changed ? 'Save & approve' : 'Approve'}
                    </button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400">SHIFT</p>
                        <p className="text-sm font-bold text-slate-800">{record.shift_hours ? shiftLabel(record.shift_hours, record.shift_type, { short: true }) : '-'}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400">TIME</p>
                        <p className="text-sm font-bold text-slate-800">
                            {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400">WORKED</p>
                        <p className="text-sm font-bold text-slate-800">{formatMinutes(record.worked_minutes)}</p>
                    </div>
                </div>

                {record.has_selfie && (
                    <div className="rounded-2xl border border-slate-100 p-2.5">
                        <CheckInCell attendance={record} size="h-14 w-14" />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Staff pay (₹)" hint="Staff sees this in earnings">
                        <input type="number" min="0" className="input" value={form.staff_amount} onChange={(e) => setForm({ ...form, staff_amount: e.target.value })} />
                    </Field>
                    <Field label="Client charge (₹)" hint={record.invoice_id ? 'Already billed, locked' : 'Used for the client bill'}>
                        <input
                            type="number"
                            min="0"
                            className="input"
                            value={form.client_amount}
                            disabled={!!record.invoice_id}
                            onChange={(e) => setForm({ ...form, client_amount: e.target.value })}
                        />
                    </Field>
                </div>
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${charge - pay >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                    <span className="text-sm font-semibold">Your profit on this duty</span>
                    <span className="text-lg font-extrabold">{formatMoney(charge - pay)}</span>
                </div>
                {changed && <p className="text-xs text-slate-500">Amounts changed from the shift rate. The new amounts will be used for payment and billing.</p>}
            </div>
        </Modal>
    );
}

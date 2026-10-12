import { useEffect, useState } from 'react';
import { Loader2, Moon, Sun } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { todayISO } from '../lib/format';
import { SHIFTS } from '../lib/staffForm';
import AssignmentShare from '../components/AssignmentShare';
import { Field, Modal, useToast } from '../components/ui';

const empty = { staff_id: '', client_id: '', start_date: todayISO(), end_date: '', shift_start: '', shift_end: '', shift_hours: 12, shift_type: 'day', staff_rate: '', client_rate: '', notes: '', status: 'active' };

/** Create / edit an assignment. `preset` can lock staff_id or client_id. */
export default function AssignmentForm({ open, onClose, assignment, preset = {}, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [applyToPast, setApplyToPast] = useState(false);
    const [shareFor, setShareFor] = useState(null);
    const [staff, setStaff] = useState([]);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setApplyToPast(false);
        setForm(
            assignment
                ? {
                      ...empty,
                      ...assignment,
                      end_date: assignment.end_date || '',
                      shift_start: assignment.shift_start?.slice(0, 5) || '',
                      shift_end: assignment.shift_end?.slice(0, 5) || '',
                      shift_hours: assignment.shift_hours || 12,
                      shift_type: assignment.shift_type || 'day',
                      staff_rate: assignment.staff_rate ?? '',
                      client_rate: assignment.client_rate ?? '',
                      notes: assignment.notes || '',
                  }
                : { ...empty, start_date: todayISO(), ...preset },
        );
        api.get('/admin/staff', { params: { status: 'active' } }).then((r) => setStaff(r.data));
        api.get('/admin/clients', { params: { status: 'active' } }).then((r) => setClients(r.data));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, assignment]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const pricingChanged =
        !!assignment &&
        (Number(form.shift_hours) !== Number(assignment.shift_hours || 12) ||
            String(form.staff_rate) !== String(assignment.staff_rate ?? '') ||
            String(form.client_rate) !== String(assignment.client_rate ?? ''));
    const margin = form.staff_rate !== '' && form.client_rate !== '' ? Number(form.client_rate) - Number(form.staff_rate) : null;
    const shiftEnd = (() => {
        if (!form.shift_start) return null;
        const [h, m] = form.shift_start.split(':').map(Number);
        const d = new Date();
        d.setHours(h + Number(form.shift_hours), m);
        return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    })();

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        const payload = {
            ...form,
            end_date: form.end_date || null,
            shift_start: form.shift_start || null,
            shift_end: null,
            staff_rate: form.staff_rate === '' ? null : form.staff_rate,
            client_rate: form.client_rate === '' ? null : form.client_rate,
            apply_to_past: applyToPast,
        };
        try {
            const res = assignment ? await api.put(`/admin/assignments/${assignment.id}`, payload) : await api.post('/admin/assignments', payload);
            toast(assignment ? 'Assignment updated' : 'Staff assigned successfully');
            onSaved?.(res.data);
            onClose();
            if (!assignment) setShareFor(res.data); // new assignment: tell staff and client
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])));
            } else toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
        <Modal
            open={open}
            onClose={onClose}
            title={assignment ? 'Edit assignment' : 'Assign staff to client'}
            subtitle="Staff will see this client in their app"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="assignment-form" className="btn-primary" disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} {assignment ? 'Save changes' : 'Assign'}
                    </button>
                </>
            }
        >
            <form id="assignment-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Staff *" error={errors.staff_id}>
                    <select className="input" value={form.staff_id} onChange={set('staff_id')} required disabled={!!preset.staff_id}>
                        <option value="">Select staff</option>
                        {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} {s.designation ? `(${s.designation})` : ''}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Client *" error={errors.client_id}>
                    <select className="input" value={form.client_id} onChange={set('client_id')} required disabled={!!preset.client_id}>
                        <option value="">Select client</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.city ? `(${c.city})` : ''}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Assigned from" error={errors.start_date} hint="Stays assigned until you remove it" className="sm:col-span-2">
                    <input type="date" className="input" value={form.start_date} onChange={set('start_date')} />
                </Field>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
                    <p className="mb-3 text-sm font-bold text-slate-800">Shift & payment</p>
                    <Field label="Shift *" error={errors.shift_hours}>
                        <div className="grid grid-cols-3 gap-2">
                            {SHIFTS.map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    onClick={() => setForm({ ...form, shift_hours: h })}
                                    className={`rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                                        Number(form.shift_hours) === h ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                                    }`}
                                >
                                    {h} hours
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Day or night *" error={errors.shift_type} className="mt-3">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                ['day', 'Day shift', Sun, '08:00'],
                                ['night', 'Night shift', Moon, '20:00'],
                            ].map(([value, label, Icon, defaultStart]) => {
                                const active = form.shift_type === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                            setForm({
                                                ...form,
                                                shift_type: value,
                                                // Suggest a usual start time; admin can still change it.
                                                shift_start: !form.shift_start || ['08:00', '20:00'].includes(form.shift_start) ? defaultStart : form.shift_start,
                                            })
                                        }
                                        className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                                            active
                                                ? value === 'day'
                                                    ? 'border-amber-500 bg-amber-500 text-white'
                                                    : 'border-brand-800 bg-brand-800 text-white'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                                        }`}
                                    >
                                        <Icon size={17} /> {label}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <Field label="Shift starts at" error={errors.shift_start} hint={shiftEnd ? `Ends at ${shiftEnd}` : 'Optional'}>
                            <input type="time" className="input" value={form.shift_start} onChange={set('shift_start')} />
                        </Field>
                        <div />
                        <Field label="Staff pay per shift (₹) *" error={errors.staff_rate} hint="Staff can see this">
                            <input type="number" min="0" step="1" className="input" value={form.staff_rate} onChange={set('staff_rate')} placeholder="e.g. 700" required />
                        </Field>
                        <Field label="Client charge per shift (₹) *" error={errors.client_rate} hint="Staff never see this">
                            <input type="number" min="0" step="1" className="input" value={form.client_rate} onChange={set('client_rate')} placeholder="e.g. 1000" required />
                        </Field>
                    </div>
                    {assignment && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                            <p>
                                {pricingChanged ? 'The new shift and rates' : 'Changes to shift and rates'} apply to duties <b>from now on</b>. Past duties keep
                                their old rate.
                            </p>
                            <label className="mt-2 flex items-start gap-2">
                                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={applyToPast} onChange={(e) => setApplyToPast(e.target.checked)} />
                                <span>Also update past duties that are not paid / billed yet (use this to fix a wrong rate).</span>
                            </label>
                        </div>
                    )}
                    {margin !== null && (
                        <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                            Your margin: ₹{margin.toLocaleString('en-IN')} per {form.shift_hours}-hour {form.shift_type === 'night' ? 'night' : 'day'} shift
                        </p>
                    )}
                </div>
                <Field label="Instructions for staff" error={errors.notes} className="sm:col-span-2">
                    <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder="e.g. Give medicines at 9 AM, check BP twice a day" />
                </Field>
            </form>
        </Modal>
        <AssignmentShare assignment={shareFor} open={!!shareFor} onClose={() => setShareFor(null)} title="Assigned! Now tell them on WhatsApp" />
        </>
    );
}

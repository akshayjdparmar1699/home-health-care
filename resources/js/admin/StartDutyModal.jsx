import { useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, Play } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatShift, formatTime, shiftLabel, toLocalInput } from '../lib/format';
import { Field, Modal, Toggle, useToast } from '../components/ui';

/** The most recent start of this assignment's shift (today's, or yesterday's if today's is still ahead). */
function lastShiftStart(assignment) {
    if (!assignment?.shift_start) return null;
    const [h, m] = assignment.shift_start.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    if (start > new Date()) start.setDate(start.getDate() - 1);
    return start;
}

/**
 * Admin starts a duty for a staff member who cannot do it from the app (no selfie needed).
 * Optionally the end time too, to record a whole duty that was missed.
 * `assignment` preselects one (e.g. from the Assignments page).
 */
export default function StartDutyModal(props) {
    return props.open ? <StartDutyForm {...props} /> : null;
}

function StartDutyForm({ open, onClose, onSaved, assignment: preset }) {
    const toast = useToast();
    const { data: assignments } = useFetch('/admin/assignments', { status: 'active' });
    const [form, setForm] = useState({ assignment_id: '', clock_in: '', ended: false, clock_out: '', notes: '' });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setForm({ assignment_id: preset?.id ? String(preset.id) : '', clock_in: toLocalInput(new Date()), ended: false, clock_out: '', notes: '' });
    }, [open, preset]);

    const list = useMemo(() => (assignments || []).filter((a) => a.status === 'active'), [assignments]);
    const selected = list.find((a) => String(a.id) === form.assignment_id) || (preset && String(preset.id) === form.assignment_id ? preset : null);
    const shiftStart = lastShiftStart(selected);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            await api.post('/admin/attendance/start', {
                assignment_id: form.assignment_id ? Number(form.assignment_id) : null,
                clock_in: form.clock_in || null,
                clock_out: form.ended ? form.clock_out || null : null,
                notes: form.notes || null,
            });
            toast(form.ended ? `Duty recorded for ${selected?.staff?.name}` : `Duty started for ${selected?.staff?.name}`);
            onSaved?.();
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
            title={form.ended ? 'Record a duty' : 'Start duty for staff'}
            subtitle="When the staff member cannot do it from the app"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="start-duty-form" className="btn-primary" disabled={saving || !form.assignment_id}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {form.ended ? 'Save duty' : 'Start duty'}
                    </button>
                </>
            }
        >
            <form id="start-duty-form" onSubmit={submit} className="space-y-4">
                <Field label="Staff and client *" error={errors.assignment_id}>
                    <select className="input" value={form.assignment_id} onChange={(e) => setForm({ ...form, assignment_id: e.target.value })} required>
                        <option value="">{assignments ? 'Select assignment' : 'Loading...'}</option>
                        {list.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.staff?.name} → {a.client?.name}
                            </option>
                        ))}
                    </select>
                </Field>

                {selected && (
                    <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
                        <Clock size={14} /> {selected.shift_hours ? `${shiftLabel(selected.shift_hours, selected.shift_type)} · ` : ''}
                        {formatShift(selected.shift_start, selected.shift_end)}
                    </p>
                )}

                <Field label="Duty started at" error={errors.clock_in}>
                    <input type="datetime-local" className="input" value={form.clock_in} max={toLocalInput(new Date())} onChange={(e) => setForm({ ...form, clock_in: e.target.value })} required />
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setForm({ ...form, clock_in: toLocalInput(new Date()) })}>
                            Now
                        </button>
                        {shiftStart && (
                            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setForm({ ...form, clock_in: toLocalInput(shiftStart) })}>
                                Shift start ({formatTime(shiftStart)})
                            </button>
                        )}
                    </div>
                </Field>

                <Toggle checked={form.ended} onChange={(v) => setForm({ ...form, ended: v })} label="The duty is already over: add the end time too" />

                {form.ended && (
                    <Field label="Duty ended at" error={errors.clock_out}>
                        <input type="datetime-local" className="input" value={form.clock_out} min={form.clock_in} max={toLocalInput(new Date())} onChange={(e) => setForm({ ...form, clock_out: e.target.value })} required />
                    </Field>
                )}

                <Field label="Reason / note" error={errors.notes}>
                    <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Phone camera not working" />
                </Field>

                <p className="text-xs text-slate-500">
                    {form.ended
                        ? 'The duty is saved as completed and waits for your payment approval as usual.'
                        : 'The staff member gets a notification and can take breaks and end the duty from the app. You can also end it here.'}
                </p>
            </form>
        </Modal>
    );
}

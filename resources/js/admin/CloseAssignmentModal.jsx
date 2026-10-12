import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { todayISO } from '../lib/format';
import { Field, Modal, useToast } from '../components/ui';

/** Close an assignment: work with this client is finished, keep it in history. */
export default function CloseAssignmentModal({ assignment, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState({ closed_on: todayISO(), note: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (assignment) setForm({ closed_on: todayISO(), note: '' });
    }, [assignment]);

    const submit = async () => {
        setSaving(true);
        try {
            await api.post(`/admin/assignments/${assignment.id}/close`, { closed_on: form.closed_on, note: form.note || null });
            toast('Assignment closed and moved to history');
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
            open={!!assignment}
            onClose={onClose}
            size="sm"
            title="Close this assignment?"
            subtitle={assignment && `${assignment.staff?.name} at ${assignment.client?.name}`}
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-primary" onClick={submit} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Close assignment
                    </button>
                </>
            }
        >
            <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                The work with this client is finished. The staff will no longer see this client in their app. Everything stays in <b>History</b>, and
                you can reopen it later.
            </p>
            <div className="space-y-4">
                <Field label="Work ended on">
                    <input type="date" className="input" value={form.closed_on} max={todayISO()} onChange={(e) => setForm({ ...form, closed_on: e.target.value })} />
                </Field>
                <Field label="Note (optional)">
                    <input
                        className="input"
                        value={form.note}
                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                        placeholder="e.g. Patient recovered, Client shifted city"
                        maxLength={500}
                    />
                </Field>
            </div>
        </Modal>
    );
}

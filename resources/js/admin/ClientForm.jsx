import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { Field, Modal, Toggle, useToast } from '../components/ui';
import CityPincodeFields from '../components/CityPincodeFields';

const empty = {
    name: '',
    phone: '',
    alt_phone: '',
    gender: '',
    age: '',
    address: '',
    city: '',
    pincode: '',
    service_type: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    is_active: true,
};

export const SERVICES = ['Elderly Care', 'Nursing Care', 'ICU at Home', 'Post-Surgery Care', 'Baby Care', 'Physiotherapy', 'Palliative Care', 'Attendant'];

export default function ClientForm({ open, onClose, client, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setErrors({});
            setForm(client ? { ...empty, ...Object.fromEntries(Object.entries(client).map(([k, v]) => [k, v ?? ''])) } : empty);
        }
    }, [open, client]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
        try {
            const res = client ? await api.put(`/admin/clients/${client.id}`, payload) : await api.post('/admin/clients', payload);
            toast(client ? 'Client updated' : 'Client added successfully');
            onSaved?.(res.data);
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
            size="lg"
            title={client ? 'Edit client' : 'Add new client'}
            subtitle="Patient / family receiving care at home"
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="client-form" className="btn-primary" disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} {client ? 'Save changes' : 'Add client'}
                    </button>
                </>
            }
        >
            <form id="client-form" onSubmit={submit} className="space-y-6">
                <section>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Patient details</h4>
                    <div className="grid gap-4 sm:grid-cols-6">
                        <Field label="Patient name *" error={errors.name} className="sm:col-span-3">
                            <input className="input" value={form.name} onChange={set('name')} required />
                        </Field>
                        <Field label="Age" error={errors.age} className="sm:col-span-1">
                            <input className="input" type="number" min="0" value={form.age} onChange={set('age')} />
                        </Field>
                        <Field label="Gender" error={errors.gender} className="sm:col-span-2">
                            <select className="input" value={form.gender} onChange={set('gender')}>
                                <option value="">Select</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
                            </select>
                        </Field>
                        <Field label="Phone *" error={errors.phone} className="sm:col-span-3">
                            <input className="input" type="tel" value={form.phone} onChange={set('phone')} required />
                        </Field>
                        <Field label="Alternate phone" error={errors.alt_phone} className="sm:col-span-3">
                            <input className="input" type="tel" value={form.alt_phone} onChange={set('alt_phone')} />
                        </Field>
                    </div>
                </section>

                <section>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Home address</h4>
                    <div className="grid gap-4 sm:grid-cols-6">
                        <Field label="Full address *" error={errors.address} className="sm:col-span-6">
                            <textarea className="input" rows={2} value={form.address} onChange={set('address')} required placeholder="House no, street, landmark" />
                        </Field>
                        <CityPincodeFields form={form} setForm={setForm} errors={errors} required cityClass="sm:col-span-4" pincodeClass="sm:col-span-2" />
                    </div>
                </section>

                <section>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Care details</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Service type" error={errors.service_type}>
                            <input className="input" list="services" value={form.service_type} onChange={set('service_type')} placeholder="Select or type" />
                            <datalist id="services">
                                {SERVICES.map((d) => (
                                    <option key={d} value={d} />
                                ))}
                            </datalist>
                        </Field>
                        <div className="flex items-end">
                            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Shift and charges are set when you assign staff to this client.</p>
                        </div>
                        <Field label="Medical notes / condition" error={errors.medical_notes} className="sm:col-span-2">
                            <textarea className="input" rows={3} value={form.medical_notes} onChange={set('medical_notes')} placeholder="Diagnosis, medicines, allergies, special instructions" />
                        </Field>
                        <Field label="Emergency contact name" error={errors.emergency_contact_name}>
                            <input className="input" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
                        </Field>
                        <Field label="Emergency contact phone" error={errors.emergency_contact_phone}>
                            <input className="input" type="tel" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
                        </Field>
                    </div>
                </section>

                <Toggle checked={!!form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active client (currently receiving care)" />
            </form>
        </Modal>
    );
}

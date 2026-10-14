import { useState } from 'react';
import { CheckCircle2, HeartHandshake, Loader2, PhoneCall, Send } from 'lucide-react';
import { BrandLogo } from '../components/Brand';
import CityPincodeFields from '../components/CityPincodeFields';
import MapLinkField from '../components/MapLinkField';
import { Field, useToast } from '../components/ui';
import api, { errorMessage } from '../lib/api';
import { SERVICES } from '../admin/ClientForm';

const empty = {
    name: '',
    age: '',
    gender: '',
    relative_name: '',
    relative_phone: '',
    address: '',
    city: '',
    pincode: '',
    map_link: '',
    service_type: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    website: '',
};

function validate(form) {
    const e = {};
    if (!form.name.trim()) e.name = 'Please enter the patient name.';
    if (!form.relative_name.trim()) e.relative_name = 'Please enter the relative name.';
    if (!/^\d{10}$/.test(form.relative_phone)) e.relative_phone = 'Enter a valid 10 digit mobile number.';
    if (!form.address.trim()) e.address = 'Please enter the home address.';
    if (!form.city) e.city = 'Please select the city.';
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Pincode must be 6 digits.';
    if (form.emergency_contact_phone && !/^\d{10}$/.test(form.emergency_contact_phone)) e.emergency_contact_phone = 'Enter a valid 10 digit number.';
    return e;
}

function Section({ title, children }) {
    return (
        <section className="card p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
            <div className="grid gap-4 sm:grid-cols-6">{children}</div>
        </section>
    );
}

/** Public form at /client/register: a patient or family member fills in their own details. */
export default function ClientRegister() {
    const toast = useToast();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [doneName, setDoneName] = useState(null);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const digits = (k, max) => (e) => setForm({ ...form, [k]: e.target.value.replace(/\D/g, '').slice(0, max) });

    const submit = async (e) => {
        e.preventDefault();
        const found = validate(form);
        setErrors(found);
        if (Object.keys(found).length) {
            toast('Please check the highlighted fields.', 'error');
            document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setSaving(true);
        try {
            const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
            const { data } = await api.post('/client-register', payload);
            setDoneName(data.name || form.name);
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])));
                toast('Please check the highlighted fields.', 'error');
            } else if (err.response?.status === 429) {
                toast('Too many tries. Please wait a minute and submit again.', 'error');
            } else {
                toast(errorMessage(err), 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    if (doneName) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-accent-50 to-white px-5 py-10">
                <div className="w-full max-w-md text-center">
                    <BrandLogo className="mx-auto mb-8 h-16 w-auto" />
                    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-60" />
                        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30">
                            <CheckCircle2 size={48} />
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Thank you!</h1>
                    <p className="mt-3 text-slate-600">We have received the details for {doneName}.</p>
                    <div className="card mt-8 flex gap-3 p-5 text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <PhoneCall size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">We will call you shortly</p>
                            <p className="text-sm text-slate-500">Our team will contact you to confirm the care plan, shift timing and caregiver.</p>
                            <p lang="gu" className="mt-1 text-sm font-medium text-brand-700">
                                અમારી ટીમ ટૂંક સમયમાં તમને ફોન કરશે.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-16">
            <div className="bg-brand-gradient px-5 pb-16 pt-8 text-center text-white">
                <div className="mx-auto inline-flex rounded-2xl bg-white px-4 py-2 shadow-lg">
                    <BrandLogo className="h-10 w-auto" />
                </div>
                <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">Home care request</h1>
                <p className="mx-auto mt-1 max-w-md text-sm text-white/80">Fill in the patient details. Our team will call you to arrange the right caregiver.</p>
                <p lang="gu" className="mt-1 text-sm font-medium text-white/90">
                    દર્દીની વિગતો ભરો, અમે તમને ફોન કરીશું.
                </p>
            </div>

            <form onSubmit={submit} noValidate className="mx-auto -mt-10 max-w-2xl space-y-4 px-4">
                <Section title="Patient details">
                    <Field label="Patient name *" error={errors.name} className="sm:col-span-4">
                        <input className="input" value={form.name} onChange={set('name')} data-error={!!errors.name} autoComplete="name" />
                    </Field>
                    <Field label="Age" error={errors.age} className="sm:col-span-2">
                        <input className="input" inputMode="numeric" value={form.age} onChange={digits('age', 3)} />
                    </Field>
                    <Field label="Gender" error={errors.gender} className="sm:col-span-2">
                        <select className="input" value={form.gender} onChange={set('gender')}>
                            <option value="">Select</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                        </select>
                    </Field>
                    <Field label="Relative name *" error={errors.relative_name} className="sm:col-span-2">
                        <input className="input" value={form.relative_name} onChange={set('relative_name')} data-error={!!errors.relative_name} autoComplete="name" placeholder="Your name" />
                    </Field>
                    <Field label="Relative number *" error={errors.relative_phone} className="sm:col-span-2">
                        <input className="input" type="tel" inputMode="numeric" value={form.relative_phone} onChange={digits('relative_phone', 10)} data-error={!!errors.relative_phone} autoComplete="tel" />
                    </Field>
                </Section>

                <Section title="Home address">
                    <Field label="Full address *" error={errors.address} className="sm:col-span-6">
                        <textarea className="input" rows={2} value={form.address} onChange={set('address')} data-error={!!errors.address} placeholder="House no, society, street, landmark" />
                    </Field>
                    <CityPincodeFields form={form} setForm={setForm} errors={errors} required cityClass="sm:col-span-4" pincodeClass="sm:col-span-2" />
                    <MapLinkField forClient value={form.map_link} onChange={(v) => setForm((f) => ({ ...f, map_link: v }))} error={errors.map_link} className="sm:col-span-6" />
                </Section>

                <Section title="Care needed">
                    <div className="sm:col-span-6">
                        <p className="mb-2 text-sm font-medium text-slate-700">Service</p>
                        <div className="flex flex-wrap gap-2">
                            {SERVICES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setForm({ ...form, service_type: form.service_type === s ? '' : s })}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                                        form.service_type === s ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                                    }`}
                                >
                                    {form.service_type === s && <HeartHandshake size={14} />} {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Field label="Medical condition / special needs" error={errors.medical_notes} className="sm:col-span-6">
                        <textarea className="input" rows={3} value={form.medical_notes} onChange={set('medical_notes')} placeholder="Diagnosis, medicines, allergies, mobility, anything the caregiver should know" />
                    </Field>
                    <Field label="Emergency contact name" error={errors.emergency_contact_name} className="sm:col-span-3">
                        <input className="input" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
                    </Field>
                    <Field label="Emergency contact mobile" error={errors.emergency_contact_phone} className="sm:col-span-3">
                        <input className="input" type="tel" inputMode="numeric" value={form.emergency_contact_phone} onChange={digits('emergency_contact_phone', 10)} data-error={!!errors.emergency_contact_phone} />
                    </Field>
                </Section>

                {/* Honeypot: hidden from people, bots fill it in. */}
                <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                <button className="btn-primary w-full py-4 text-base" disabled={saving}>
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Submit details
                </button>
                <p className="text-center text-xs text-slate-400">Your details are shared only with our care team.</p>
            </form>
        </div>
    );
}

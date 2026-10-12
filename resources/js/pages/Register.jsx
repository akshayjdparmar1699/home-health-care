import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../components/Brand';
import api, { errorMessage } from '../lib/api';
import { emptyStaffForm, mapErrors, RULES_GU, RULES_TITLE, staffFormData } from '../lib/staffForm';
import StaffProfileFields from '../components/StaffProfileFields';
import { useToast } from '../components/ui';

const DRAFT_KEY = 'hc_register_draft';

const STEPS = [
    { key: 'account', title: 'Account', subtitle: 'Your login details', sections: ['account'] },
    { key: 'personal', title: 'Personal information', subtitle: 'As per your Aadhaar card', sections: ['personal'] },
    { key: 'address', title: 'Address & emergency contact', sections: ['address'] },
    { key: 'education', title: 'Education & experience', subtitle: 'Fill whatever applies to you', sections: ['education', 'experience'] },
    { key: 'bank', title: 'Bank details', subtitle: 'For your salary payments', sections: ['bank'] },
    { key: 'documents', title: 'Selfie & Aadhaar card', subtitle: 'Clear photos help faster approval', sections: ['documents'] },
    { key: 'declaration', title: 'Declaration', sections: ['medical'] },
];

const FIELD_STEP = {
    name: 0, phone: 0, email: 0, designation: 0, city: 0, pincode: 0, password: 0, password_confirmation: 0,
    father_name: 1, dob: 1, gender: 1, blood_group: 1, whatsapp: 1, aadhaar_number: 1, pan_number: 1,
    address: 2, permanent_address: 2, emergency_name: 2, emergency_relation: 2, emergency_phone: 2,
    qualification: 3, institute: 3, institute_year: 3, ssc_school: 3, ssc_year: 3, hsc_school: 3, hsc_year: 3,
    nursing_qualification: 3, other_qualification: 3, registration_number: 3,
    previous_organization: 3, experience_years: 3, experience_months: 3, skills: 3, skills_other: 3,
    bank_account_name: 4, bank_name: 4, bank_account_number: 4, bank_ifsc: 4, upi_id: 4,
    selfie: 5, aadhaar_front: 5, aadhaar_back: 5,
    has_illness: 6, illness_details: 6, terms: 6,
};

/** Quick client-side checks so people don't walk to the end to find mistakes. */
function validateStep(step, form, files) {
    const e = {};
    const need = (k, msg = 'This field is required.') => !String(form[k] ?? '').trim() && (e[k] = msg);
    if (step === 0) {
        need('name');
        if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10 digit mobile number.';
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email.';
        need('city', 'Please select your city.');
        if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = 'Pincode must be 6 digits.';
        if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
        if (form.password !== form.password_confirmation) e.password_confirmation = 'Passwords do not match.';
    }
    if (step === 1) {
        need('father_name');
        need('dob');
        need('gender', 'Please select gender.');
        if (!form.same_whatsapp && form.whatsapp && !/^\d{10}$/.test(form.whatsapp)) e.whatsapp = 'Enter a valid 10 digit number.';
        if (!/^\d{12}$/.test(form.aadhaar_number)) e.aadhaar_number = 'Aadhaar number must be 12 digits.';
        if (form.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan_number)) e.pan_number = 'Enter a valid PAN (e.g. ABCDE1234F).';
    }
    if (step === 2) {
        need('address');
        if (!form.same_address) need('permanent_address');
        need('emergency_name');
        need('emergency_relation');
        if (!/^\d{10}$/.test(form.emergency_phone)) e.emergency_phone = 'Enter a valid 10 digit number.';
    }
    if (step === 4) {
        if (form.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bank_ifsc)) e.bank_ifsc = 'Enter a valid IFSC (e.g. HDFC0001234).';
    }
    if (step === 5) {
        if (!files.selfie) e.selfie = 'Please take a selfie.';
        if (!files.aadhaar_front) e.aadhaar_front = 'Upload front side.';
        if (!files.aadhaar_back) e.aadhaar_back = 'Upload back side.';
    }
    if (step === 6) {
        if (form.has_illness === '') e.has_illness = 'Please select Yes or No.';
        if (form.has_illness === '1') need('illness_details');
        if (!form.terms) e.terms = 'Please accept the rules and regulations to continue.';
    }
    return e;
}

function loadDraft() {
    try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        const base = emptyStaffForm();
        if (!d || typeof d !== 'object') return base;
        // Only keep known keys whose type matches the empty form, so an old/corrupt draft can't break the page.
        const safe = Object.fromEntries(
            Object.entries(d).filter(([k, v]) => k in base && v !== null && (Array.isArray(base[k]) ? Array.isArray(v) : typeof v === typeof base[k])),
        );
        return { ...base, ...safe, password: '', password_confirmation: '', terms: false };
    } catch {
        return emptyStaffForm();
    }
}

export default function Register() {
    const navigate = useNavigate();
    const toast = useToast();
    const [step, setStep] = useState(0);
    const [form, setForm] = useState(loadDraft);
    const [files, setFiles] = useState({ selfie: null, aadhaar_front: null, aadhaar_back: null });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Keep a draft (without password / photos) in case the page is closed.
    useEffect(() => {
        try {
            const { password, password_confirmation, terms, ...rest } = form;
            localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
        } catch {
            // storage unavailable
        }
    }, [form]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const current = STEPS[step];
    const last = step === STEPS.length - 1;
    const progress = useMemo(() => Math.round(((step + 1) / STEPS.length) * 100), [step]);

    const next = () => {
        const e = validateStep(step, form, files);
        setErrors(e);
        if (Object.keys(e).length) return toast('Please check the highlighted fields', 'error');
        setStep(step + 1);
    };

    const submit = async () => {
        const e = validateStep(step, form, files);
        setErrors(e);
        if (Object.keys(e).length) return toast('Please check the highlighted fields', 'error');

        setSubmitting(true);
        try {
            const res = await api.post('/register', staffFormData(form, files), { headers: { 'Content-Type': 'multipart/form-data' } });
            try {
                localStorage.removeItem(DRAFT_KEY);
            } catch {
                // ignore
            }
            navigate('/register/success', { replace: true, state: { name: res.data.name } });
        } catch (err) {
            if (err.response?.status === 422) {
                const mapped = mapErrors(err);
                setErrors(mapped);
                const firstStep = Math.min(...Object.keys(mapped).map((k) => FIELD_STEP[k] ?? 6));
                setStep(firstStep);
                toast(Object.values(mapped)[0], 'error');
            } else if (err.response?.status === 413) {
                toast('Photos are too large. Please retake them.', 'error');
            } else {
                toast(errorMessage(err), 'error');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-accent-50 via-slate-50 to-slate-50">
            {/* Header */}
            <header className="safe-top sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
                    <BrandLogo variant="emblem" className="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                        <p className="font-extrabold leading-tight text-slate-900">Staff Registration</p>
                        <p className="text-xs text-slate-500">
                            Step {step + 1} of {STEPS.length} · {current.title}
                        </p>
                    </div>
                    <Link to="/staff/login" className="text-sm font-semibold text-brand-700">
                        Login
                    </Link>
                </div>
                <div className="h-1 bg-slate-100">
                    <div className="bg-brand-gradient h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 pb-32 pt-5">
                {/* Step dots */}
                <div className="mb-5 flex justify-center gap-1.5">
                    {STEPS.map((s, i) => (
                        <button
                            key={s.key}
                            onClick={() => i < step && setStep(i)}
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-600' : 'bg-slate-200 text-slate-500'
                            }`}
                            aria-label={s.title}
                        >
                            {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
                        </button>
                    ))}
                </div>

                <div className="card p-5 sm:p-6">
                    <div className="mb-5">
                        <h1 className="text-xl font-extrabold text-slate-900">{current.title}</h1>
                        {current.subtitle && <p className="text-sm text-slate-500">{current.subtitle}</p>}
                    </div>

                    <div className="space-y-8">
                        {current.sections.map((sec) => (
                            <div key={sec}>
                                {current.sections.length > 1 && (
                                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{sec === 'education' ? 'Educational qualification' : 'Experience details'}</p>
                                )}
                                <StaffProfileFields section={sec} form={form} setForm={setForm} files={files} setFiles={setFiles} errors={errors} mode="register" />
                            </div>
                        ))}
                    </div>

                    {last && (
                        <div className="mt-8">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                                <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-900" lang="gu">
                                    <ShieldCheck size={18} className="shrink-0 text-brand-600" />
                                    {RULES_TITLE}
                                </h2>
                                <ol className="max-h-[50vh] space-y-2.5 overflow-y-auto pr-1 text-[15px] leading-relaxed text-slate-700" lang="gu">
                                    {RULES_GU.map((r, i) => (
                                        <li key={i} className="flex gap-2.5">
                                            <span className="shrink-0 font-bold text-brand-700">{i + 1}.</span>
                                            <span>{r}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <label
                                className={`mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                                    form.terms ? 'border-brand-500 bg-brand-50' : errors.terms ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
                                    checked={form.terms}
                                    onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))}
                                />
                                <span className="text-sm text-slate-700">
                                    <span lang="gu" className="block font-semibold text-slate-900">
                                        મેં ઉપરના તમામ નિયમો અને શરતો વાંચ્યા છે અને મને મંજૂર છે.
                                    </span>
                                    I have read and accept all the above rules and regulations, and the information given by me is true.
                                </span>
                            </label>
                            {errors.terms && <p className="mt-1 text-xs font-medium text-rose-600">{errors.terms}</p>}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer nav */}
            <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-2xl gap-3 px-4 py-3">
                    {step > 0 && (
                        <button className="btn-secondary px-5 py-3.5" onClick={() => setStep(step - 1)} disabled={submitting}>
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    {last ? (
                        <button className="btn-primary flex-1 py-3.5 text-base" onClick={submit} disabled={submitting || !form.terms}>
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {submitting ? 'Submitting...' : 'Submit application'}
                        </button>
                    ) : (
                        <button className="btn-primary flex-1 py-3.5 text-base" onClick={next}>
                            Next <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

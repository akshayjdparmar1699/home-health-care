import { Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { BLOOD_GROUPS, NURSING_COURSES, SKILLS } from '../lib/staffForm';
import RoleSelect from './RoleSelect';
import AuthImage from './AuthImage';
import CityPincodeFields from './CityPincodeFields';
import PhotoPicker from './PhotoPicker';
import { Field, Toggle } from './ui';

function Check2({ checked, onChange, label }) {
    return (
        <label
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                checked ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            }`}
        >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'}`}>
                {checked && <Check size={13} strokeWidth={3} />}
            </span>
            <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

export function SectionTitle({ number, title, subtitle }) {
    return (
        <div className="mb-4 flex items-start gap-3">
            {number && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">{number}</span>
            )}
            <div>
                <h3 className="font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
        </div>
    );
}

/**
 * Staff profile inputs, grouped in sections so the register wizard and the admin editor can share them.
 * mode: 'register' | 'admin'
 */
export default function StaffProfileFields({ section, form, setForm, files, setFiles, errors = {}, mode = 'register', staff = null }) {
    const [showPw, setShowPw] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const digits = (k, max) => (e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, '').slice(0, max) }));
    const upper = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value.toUpperCase().replace(/\s/g, '') }));
    const req = mode === 'register' ? ' *' : '';
    const yearOpts = { inputMode: 'numeric', maxLength: 4, placeholder: 'YYYY' };

    if (section === 'account')
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *" error={errors.name} className="sm:col-span-2">
                    <input className="input" value={form.name} onChange={set('name')} placeholder="As per Aadhaar card" autoComplete="name" />
                </Field>
                <Field label="Mobile number *" error={errors.phone} hint={mode === 'register' ? 'You will log in with this number' : 'Used to log in'}>
                    <input className="input" type="tel" inputMode="numeric" value={form.phone} onChange={digits('phone', 10)} placeholder="10 digit mobile" />
                </Field>
                <Field label="Email ID" error={errors.email}>
                    <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="Optional" autoComplete="email" />
                </Field>
                <CityPincodeFields form={form} setForm={setForm} errors={errors} required={mode === 'register'} />
                {mode === 'admin' && (
                    <Field label="Role / designation (optional)" error={errors.designation} className="sm:col-span-2">
                        <RoleSelect value={form.designation} onChange={(v) => setForm((f) => ({ ...f, designation: v }))} />
                    </Field>
                )}
                <Field
                    label={mode === 'admin' && staff ? 'New password' : 'Password *'}
                    error={errors.password}
                    hint={mode === 'admin' && staff ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                >
                    <div className="relative">
                        <input
                            className="input pr-11"
                            type={showPw ? 'text' : 'password'}
                            value={form.password}
                            onChange={set('password')}
                            autoComplete="new-password"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400">
                            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </Field>
                {mode === 'register' && (
                    <>
                    <Field label="Confirm password *" error={errors.password_confirmation}>
                        <input
                            className="input"
                            type={showPw ? 'text' : 'password'}
                            value={form.password_confirmation}
                            onChange={set('password_confirmation')}
                            autoComplete="new-password"
                        />
                    </Field>
                    <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                        <KeyRound size={20} className="mt-0.5 shrink-0 text-amber-600" />
                        <div className="text-sm text-amber-900">
                            <p className="font-bold">Please remember this password.</p>
                            <p>You will need your mobile number and this password every time you log in.</p>
                            <p lang="gu" className="mt-1 font-medium">
                                આ પાસવર્ડ યાદ રાખો, લૉગિન કરતી વખતે તેની જરૂર પડશે.
                            </p>
                        </div>
                    </div>
                    </>
                )}
                {mode === 'admin' && (
                    <>
                        <Field label="Joining date" error={errors.joining_date}>
                            <input className="input" type="date" value={form.joining_date || ''} onChange={set('joining_date')} />
                        </Field>
                        <div className="flex items-end pb-2">
                            <Toggle checked={!!form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} label="Account active" />
                        </div>
                    </>
                )}
            </div>
        );

    if (section === 'personal')
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Father's / Husband's name${req}`} error={errors.father_name} className="sm:col-span-2">
                    <input className="input" value={form.father_name} onChange={set('father_name')} />
                </Field>
                <Field label={`Date of birth${req}`} error={errors.dob}>
                    <input className="input" type="date" value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} />
                </Field>
                <Field label="Blood group" error={errors.blood_group}>
                    <select className="input" value={form.blood_group} onChange={set('blood_group')}>
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map((b) => (
                            <option key={b}>{b}</option>
                        ))}
                    </select>
                </Field>
                <Field label={`Gender${req}`} error={errors.gender} className="sm:col-span-2">
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            ['male', 'Male'],
                            ['female', 'Female'],
                            ['other', 'Other'],
                        ].map(([v, l]) => (
                            <Check2 key={v} checked={form.gender === v} onChange={() => setForm((f) => ({ ...f, gender: v }))} label={l} />
                        ))}
                    </div>
                </Field>
                <Field label="WhatsApp number" error={errors.whatsapp} className="sm:col-span-2">
                    <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-600"
                            checked={form.same_whatsapp}
                            onChange={(e) => setForm((f) => ({ ...f, same_whatsapp: e.target.checked }))}
                        />
                        Same as mobile number
                    </label>
                    {!form.same_whatsapp && (
                        <input className="input" type="tel" inputMode="numeric" value={form.whatsapp} onChange={digits('whatsapp', 10)} placeholder="10 digit number" />
                    )}
                </Field>
                <Field label={`Aadhaar number${req}`} error={errors.aadhaar_number}>
                    <input
                        className="input tracking-wider"
                        inputMode="numeric"
                        value={form.aadhaar_number.replace(/(\d{4})(?=\d)/g, '$1 ')}
                        onChange={digits('aadhaar_number', 12)}
                        placeholder="1234 5678 9012"
                    />
                </Field>
                <Field label="PAN number (optional)" error={errors.pan_number}>
                    <input className="input uppercase" value={form.pan_number} onChange={upper('pan_number')} maxLength={10} placeholder="ABCDE1234F" />
                </Field>
            </div>
        );

    if (section === 'address')
        return (
            <div className="space-y-4">
                <Field label={`Current address${req}`} error={errors.address}>
                    <textarea className="input" rows={2} value={form.address} onChange={set('address')} placeholder="House no, street, area, landmark" />
                </Field>
                <Field label={`Permanent address${req}`} error={errors.permanent_address}>
                    <label className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-brand-600"
                            checked={form.same_address}
                            onChange={(e) => setForm((f) => ({ ...f, same_address: e.target.checked }))}
                        />
                        Same as current address
                    </label>
                    {!form.same_address && <textarea className="input" rows={2} value={form.permanent_address} onChange={set('permanent_address')} />}
                </Field>
                <div className="rounded-2xl bg-rose-50/60 p-4">
                    <p className="mb-3 text-sm font-bold text-rose-800">Emergency contact person</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label={`Name${req}`} error={errors.emergency_name}>
                            <input className="input" value={form.emergency_name} onChange={set('emergency_name')} />
                        </Field>
                        <Field label={`Relationship${req}`} error={errors.emergency_relation}>
                            <input className="input" list="relations" value={form.emergency_relation} onChange={set('emergency_relation')} placeholder="e.g. Father" />
                            <datalist id="relations">
                                {['Father', 'Mother', 'Husband', 'Wife', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend'].map((r) => (
                                    <option key={r} value={r} />
                                ))}
                            </datalist>
                        </Field>
                        <Field label={`Mobile${req}`} error={errors.emergency_phone}>
                            <input className="input" type="tel" inputMode="numeric" value={form.emergency_phone} onChange={digits('emergency_phone', 10)} />
                        </Field>
                    </div>
                </div>
            </div>
        );

    if (section === 'education')
        return (
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Highest qualification" error={errors.qualification} className="sm:col-span-3">
                    <input className="input" value={form.qualification} onChange={set('qualification')} placeholder="e.g. GNM, 12th Pass, B.Sc Nursing" />
                </Field>
                <Field label="Institute" error={errors.institute} className="sm:col-span-2">
                    <input className="input" value={form.institute} onChange={set('institute')} />
                </Field>
                <Field label="Year" error={errors.institute_year}>
                    <input className="input" {...yearOpts} value={form.institute_year} onChange={digits('institute_year', 4)} />
                </Field>
                <Field label="SSC (10th) school / board" error={errors.ssc_school} className="sm:col-span-2">
                    <input className="input" value={form.ssc_school} onChange={set('ssc_school')} />
                </Field>
                <Field label="Year" error={errors.ssc_year}>
                    <input className="input" {...yearOpts} value={form.ssc_year} onChange={digits('ssc_year', 4)} />
                </Field>
                <Field label="HSC (12th) school / board" error={errors.hsc_school} className="sm:col-span-2">
                    <input className="input" value={form.hsc_school} onChange={set('hsc_school')} />
                </Field>
                <Field label="Year" error={errors.hsc_year}>
                    <input className="input" {...yearOpts} value={form.hsc_year} onChange={digits('hsc_year', 4)} />
                </Field>
                <Field label="ANM / GNM / B.Sc Nursing" error={errors.nursing_qualification}>
                    <input className="input" list="nursing" value={form.nursing_qualification} onChange={set('nursing_qualification')} placeholder="If any" />
                    <datalist id="nursing">
                        {NURSING_COURSES.map((n) => (
                            <option key={n} value={n} />
                        ))}
                    </datalist>
                </Field>
                <Field label="Other qualification" error={errors.other_qualification}>
                    <input className="input" value={form.other_qualification} onChange={set('other_qualification')} />
                </Field>
                <Field label="Registration no. (if applicable)" error={errors.registration_number}>
                    <input className="input" value={form.registration_number} onChange={set('registration_number')} placeholder="Nursing council no." />
                </Field>
            </div>
        );

    if (section === 'experience')
        return (
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                    <Field label="Previous organization" error={errors.previous_organization} className="sm:col-span-2">
                        <input className="input" value={form.previous_organization} onChange={set('previous_organization')} placeholder="Hospital / agency name" />
                    </Field>
                    <Field label="Experience (years)" error={errors.experience_years}>
                        <input className="input" inputMode="numeric" value={form.experience_years} onChange={digits('experience_years', 2)} placeholder="0" />
                    </Field>
                    <Field label="Months" error={errors.experience_months}>
                        <select className="input" value={form.experience_months} onChange={set('experience_months')}>
                            <option value="">0</option>
                            {Array.from({ length: 11 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <Field label="Special skills" error={errors.skills}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {SKILLS.map((s) => (
                            <Check2
                                key={s}
                                label={s}
                                checked={form.skills.includes(s)}
                                onChange={(on) => setForm((f) => ({ ...f, skills: on ? [...f.skills, s] : f.skills.filter((x) => x !== s) }))}
                            />
                        ))}
                    </div>
                </Field>
                {form.skills.includes('Other') && (
                    <Field label="Other skills" error={errors.skills_other}>
                        <input className="input" value={form.skills_other} onChange={set('skills_other')} />
                    </Field>
                )}
            </div>
        );

    if (section === 'bank')
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Account holder name" error={errors.bank_account_name}>
                    <input className="input" value={form.bank_account_name} onChange={set('bank_account_name')} />
                </Field>
                <Field label="Bank name" error={errors.bank_name}>
                    <input className="input" value={form.bank_name} onChange={set('bank_name')} />
                </Field>
                <Field label="Account number" error={errors.bank_account_number}>
                    <input className="input" inputMode="numeric" value={form.bank_account_number} onChange={digits('bank_account_number', 20)} />
                </Field>
                <Field label="IFSC code" error={errors.bank_ifsc}>
                    <input className="input uppercase" value={form.bank_ifsc} onChange={upper('bank_ifsc')} maxLength={11} placeholder="HDFC0001234" />
                </Field>
                <Field label="UPI ID" error={errors.upi_id} className="sm:col-span-2" hint="Salary can be sent here">
                    <input className="input" value={form.upi_id} onChange={(e) => setForm((f) => ({ ...f, upi_id: e.target.value.trim() }))} placeholder="name@upi" />
                </Field>
            </div>
        );

    if (section === 'documents') {
        const existing = (type) =>
            staff?.profile?.documents?.[type] ? <AuthImage src={`/admin/staff/${staff.id}/documents/${type}`} alt={type} className="h-full w-full" /> : null;
        return (
            <div className="space-y-5">
                <div className="mx-auto max-w-[220px]">
                    <PhotoPicker
                        label={`Your selfie${req}`}
                        selfie
                        aspect="aspect-[3/4]"
                        value={files.selfie}
                        onChange={(b) => setFiles((f) => ({ ...f, selfie: b }))}
                        error={errors.selfie}
                        hint="Clear face photo"
                        existing={existing('selfie')}
                    />
                </div>
                <div>
                    <p className="label">Aadhaar card{req}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <PhotoPicker
                            hint="Front side"
                            value={files.aadhaar_front}
                            onChange={(b) => setFiles((f) => ({ ...f, aadhaar_front: b }))}
                            error={errors.aadhaar_front}
                            existing={existing('aadhaar_front')}
                        />
                        <PhotoPicker
                            hint="Back side"
                            value={files.aadhaar_back}
                            onChange={(b) => setFiles((f) => ({ ...f, aadhaar_back: b }))}
                            error={errors.aadhaar_back}
                            existing={existing('aadhaar_back')}
                        />
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-3 text-center text-xs font-semibold text-slate-500">
                        <span>Front side</span>
                        <span>Back side</span>
                    </div>
                </div>
            </div>
        );
    }

    if (section === 'medical')
        return (
            <div className="space-y-3">
                <Field label={`Do you have any major illness?${req}`} error={errors.has_illness}>
                    <div className="grid grid-cols-2 gap-2 sm:w-64">
                        <Check2 label="No" checked={form.has_illness === '0'} onChange={() => setForm((f) => ({ ...f, has_illness: '0', illness_details: '' }))} />
                        <Check2 label="Yes" checked={form.has_illness === '1'} onChange={() => setForm((f) => ({ ...f, has_illness: '1' }))} />
                    </div>
                </Field>
                {form.has_illness === '1' && (
                    <Field label="If yes, details *" error={errors.illness_details}>
                        <textarea className="input" rows={2} value={form.illness_details} onChange={set('illness_details')} />
                    </Field>
                )}
            </div>
        );

    return null;
}

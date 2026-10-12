import { useState } from 'react';
import { Banknote, BriefcaseMedical, Copy, Eye, EyeOff, FileImage, GraduationCap, HeartPulse, IdCard, KeyRound, X } from 'lucide-react';
import AuthImage from '../components/AuthImage';
import { useToast } from '../components/ui';
import { formatDate } from '../lib/format';

function Row({ label, value }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="flex justify-between gap-4 border-b border-slate-50 py-2 text-sm last:border-0">
            <span className="shrink-0 text-slate-500">{label}</span>
            <span className="text-right font-medium text-slate-800">{value}</span>
        </div>
    );
}

function Block({ icon: Icon, title, children }) {
    return (
        <div className="card p-5">
            <p className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                <Icon size={17} className="text-brand-600" /> {title}
            </p>
            {children}
        </div>
    );
}

function LoginCard({ staff }) {
    const toast = useToast();
    const [show, setShow] = useState(false);
    const pw = staff.password_plain;

    return (
        <div className="card flex flex-wrap items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <KeyRound size={22} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">Login details</p>
                <p className="text-sm text-slate-500">
                    Mobile <b className="text-slate-800">{staff.phone}</b>
                    {staff.email && (
                        <>
                            {' '}
                            or <b className="text-slate-800">{staff.email}</b>
                        </>
                    )}
                </p>
            </div>
            {pw ? (
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 py-1 pl-4 pr-1">
                    <span className="font-mono text-base font-semibold tracking-wide text-slate-900">{show ? pw : '••••••••'}</span>
                    <button className="rounded-lg p-2 text-slate-500 hover:bg-white" onClick={() => setShow(!show)} title={show ? 'Hide' : 'Show'}>
                        {show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                    <button
                        className="rounded-lg p-2 text-slate-500 hover:bg-white"
                        title="Copy"
                        onClick={() =>
                            navigator.clipboard
                                ?.writeText(pw)
                                .then(() => toast('Password copied'))
                                .catch(() => setShow(true))
                        }
                    >
                        <Copy size={17} />
                    </button>
                </div>
            ) : (
                <p className="max-w-xs text-xs text-slate-400">Password not saved (set before this feature). Set a new one from Edit to see it here.</p>
            )}
        </div>
    );
}

const maskAadhaar = (n) => (n ? n.replace(/(\d{4})(?=\d)/g, '$1 ') : null);

/** Read-only view of a staff member's full registration details and documents. */
export default function StaffProfileView({ staff }) {
    const p = staff.profile || {};
    const [zoom, setZoom] = useState(null);
    const docs = p.documents || {};
    const age = p.dob ? Math.floor((Date.now() - new Date(p.dob)) / (365.25 * 864e5)) : null;
    const exp = [p.experience_years && `${p.experience_years} yrs`, p.experience_months && `${p.experience_months} months`].filter(Boolean).join(' ');

    return (
        <div className="space-y-4">
            <LoginCard staff={staff} />

            <Block icon={FileImage} title="Selfie & Aadhaar card">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        ['selfie', 'Selfie', 'aspect-[3/4]'],
                        ['aadhaar_front', 'Aadhaar front', 'aspect-[4/3]'],
                        ['aadhaar_back', 'Aadhaar back', 'aspect-[4/3]'],
                    ].map(([type, label, aspect]) => (
                        <div key={type}>
                            {docs[type] ? (
                                <AuthImage
                                    src={`/admin/staff/${staff.id}/documents/${type}`}
                                    alt={label}
                                    className={`w-full cursor-zoom-in rounded-xl ${aspect}`}
                                    onClick={(url) => setZoom({ url, label })}
                                />
                            ) : (
                                <div className={`flex w-full items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 ${aspect}`}>Not uploaded</div>
                            )}
                            <p className="mt-1 text-center text-xs font-semibold text-slate-500">{label}</p>
                        </div>
                    ))}
                </div>
            </Block>

            <div className="grid gap-4 lg:grid-cols-2">
                <Block icon={IdCard} title="Personal information">
                    <Row label="Father's / Husband's name" value={p.father_name} />
                    <Row label="Date of birth" value={p.dob && `${formatDate(p.dob)}${age ? ` (${age} yrs)` : ''}`} />
                    <Row label="Gender" value={staff.gender && staff.gender[0].toUpperCase() + staff.gender.slice(1)} />
                    <Row label="Blood group" value={p.blood_group} />
                    <Row label="Mobile" value={staff.phone} />
                    <Row label="WhatsApp" value={p.whatsapp} />
                    <Row label="Email" value={staff.email} />
                    <Row label="Aadhaar no." value={maskAadhaar(p.aadhaar_number)} />
                    <Row label="PAN no." value={p.pan_number} />
                    <Row label="City" value={[staff.city, staff.pincode].filter(Boolean).join(' - ')} />
                    <Row label="Current address" value={staff.address} />
                    <Row label="Permanent address" value={p.permanent_address === staff.address ? 'Same as current' : p.permanent_address} />
                    {p.emergency_name && (
                        <div className="mt-2 rounded-xl bg-rose-50 p-3 text-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Emergency contact</p>
                            <a href={`tel:${p.emergency_phone}`} className="mt-1 block text-slate-800">
                                <b>{p.emergency_name}</b> ({p.emergency_relation}) · {p.emergency_phone}
                            </a>
                        </div>
                    )}
                </Block>

                <div className="space-y-4">
                    <Block icon={GraduationCap} title="Education">
                        <Row label="Qualification" value={p.qualification} />
                        <Row label="Institute" value={[p.institute, p.institute_year].filter(Boolean).join(' · ')} />
                        <Row label="SSC" value={[p.ssc_school, p.ssc_year].filter(Boolean).join(' · ')} />
                        <Row label="HSC" value={[p.hsc_school, p.hsc_year].filter(Boolean).join(' · ')} />
                        <Row label="ANM / GNM / B.Sc" value={p.nursing_qualification} />
                        <Row label="Other" value={p.other_qualification} />
                        <Row label="Registration no." value={p.registration_number} />
                        {!p.qualification && !p.institute && !p.nursing_qualification && <p className="text-sm text-slate-400">Not provided</p>}
                    </Block>

                    <Block icon={BriefcaseMedical} title="Experience">
                        <Row label="Previous organization" value={p.previous_organization} />
                        <Row label="Experience" value={exp} />
                        {p.skills?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {p.skills.map((s) => (
                                    <span key={s} className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                        {s === 'Other' && p.skills_other ? p.skills_other : s}
                                    </span>
                                ))}
                            </div>
                        )}
                        {!p.previous_organization && !exp && !p.skills?.length && <p className="text-sm text-slate-400">Not provided</p>}
                    </Block>
                </div>

                <Block icon={Banknote} title="Bank details">
                    <Row label="Account holder" value={p.bank_account_name} />
                    <Row label="Bank" value={p.bank_name} />
                    <Row label="Account no." value={p.bank_account_number} />
                    <Row label="IFSC" value={p.bank_ifsc} />
                    <Row label="UPI ID" value={p.upi_id} />
                    {!p.bank_account_number && !p.upi_id && <p className="text-sm text-slate-400">Not provided</p>}
                </Block>

                <Block icon={HeartPulse} title="Medical declaration & terms">
                    <Row label="Major illness" value={p.has_illness === null || p.has_illness === undefined ? null : p.has_illness ? 'Yes' : 'No'} />
                    {p.has_illness && p.illness_details && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{p.illness_details}</p>}
                    <Row label="Rules accepted" value={p.terms_accepted_at ? formatDate(p.terms_accepted_at) : staff.registered_via === 'admin' ? 'Added by admin' : 'No'} />
                    <Row label="Registered" value={`${staff.registered_via === 'self' ? 'Self registration' : 'Added by admin'} · ${formatDate(staff.created_at)}`} />
                </Block>
            </div>

            {zoom && (
                <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(null)}>
                    <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white">
                        <X size={22} />
                    </button>
                    <img src={zoom.url} alt={zoom.label} className="max-h-full max-w-full rounded-xl" />
                </div>
            )}
        </div>
    );
}

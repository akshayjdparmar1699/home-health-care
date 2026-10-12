import { useEffect, useState } from 'react';
import { Building2, Download, Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, Phone } from 'lucide-react';
import { isStandalone, openInstallGuide } from '../lib/pwa';
import { useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Field, useToast } from '../components/ui';

function BusinessSettings() {
    const toast = useToast();
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/admin/settings').then((r) => setForm(Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, v ?? '']))));
    }, []);

    if (!form) return null;
    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/admin/settings', Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])));
            toast('Business details saved');
        } catch (err) {
            toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="card space-y-4 p-5">
            <div>
                <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-brand-600" />
                    <h3 className="font-bold text-slate-900">Business details</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Shown on client bills</p>
            </div>
            <Field label="Business name *">
                <input className="input" value={form.business_name} onChange={set('business_name')} required />
            </Field>
            <Field label="Address">
                <textarea className="input" rows={2} value={form.business_address} onChange={set('business_address')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone">
                    <input className="input" value={form.business_phone} onChange={set('business_phone')} />
                </Field>
                <Field label="Email">
                    <input className="input" type="email" value={form.business_email} onChange={set('business_email')} />
                </Field>
            </div>
            <Field label="GSTIN" hint="Optional">
                <input className="input" value={form.gstin} onChange={set('gstin')} />
            </Field>
            <Field label="Bank / UPI details" hint="Printed on bills so clients know how to pay">
                <textarea className="input" rows={3} value={form.bank_details} onChange={set('bank_details')} placeholder={'Bank: HDFC, A/C: 1234567890, IFSC: HDFC0001234\nUPI: homecare@upi'} />
            </Field>
            <Field label="Terms on bill">
                <textarea className="input" rows={2} value={form.invoice_terms} onChange={set('invoice_terms')} placeholder="e.g. Please pay within 7 days." />
            </Field>
            <button className="btn-primary w-full sm:w-auto" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />} Save details
            </button>
        </form>
    );
}

export default function Settings() {
    const { user, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [saving, setSaving] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const isStaff = user.role === 'staff';

    // Staff see their current password pre-filled so they don't forget it.
    useEffect(() => {
        if (!isStaff) return;
        api.get('/me', { params: { with_password: 1 } })
            .then((r) => r.data.password_plain && setForm((f) => ({ ...f, current_password: r.data.password_plain })))
            .catch(() => {});
    }, [isStaff]);

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/change-password', form);
            toast('Password changed successfully');
            setForm({ current_password: isStaff ? form.password : '', password: '', password_confirmation: '' });
        } catch (err) {
            toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    const doLogout = async () => {
        await logout();
        navigate(user.role === 'admin' ? '/admin/login' : '/staff/login', { replace: true });
    };

    return (
        <div className="mx-auto max-w-xl space-y-4">
            <div className="card flex items-center gap-4 p-5">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-slate-900">{user.name}</h2>
                    <p className="text-sm font-medium text-brand-700">{user.designation || (user.role === 'admin' ? 'Administrator' : 'Staff')}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <Phone size={14} /> {user.phone}
                        </span>
                        {user.email && (
                            <span className="flex items-center gap-1.5">
                                <Mail size={14} /> {user.email}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={submit} className="card space-y-4 p-5">
                <div className="flex items-center gap-2">
                    <KeyRound size={18} className="text-brand-600" />
                    <h3 className="font-bold text-slate-900">{isStaff ? 'My password' : 'Change password'}</h3>
                </div>
                <Field label={isStaff ? 'Your current password' : 'Current password'} hint={isStaff ? 'Tap the eye to see your password. Use it with your mobile number to log in.' : undefined}>
                    <div className="relative">
                        <input
                            type={showCurrent ? 'text' : 'password'}
                            className="input pr-11"
                            value={form.current_password}
                            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            title={showCurrent ? 'Hide' : 'Show'}
                        >
                            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </Field>
                {isStaff && <p className="-mt-1 text-sm font-semibold text-slate-700">Want a new password? Enter it below.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="New password">
                        <input
                            type="password"
                            className="input"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            minLength={6}
                            required
                        />
                    </Field>
                    <Field label="Confirm new password">
                        <input
                            type="password"
                            className="input"
                            value={form.password_confirmation}
                            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                            required
                        />
                    </Field>
                </div>
                <button className="btn-primary w-full sm:w-auto" disabled={saving}>
                    {saving && <Loader2 size={16} className="animate-spin" />} Update password
                </button>
            </form>

            {!isStandalone() && (
                <button onClick={openInstallGuide} className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-accent-200">
                    <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-2xl shadow" />
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">Install the app</p>
                        <p className="text-sm text-slate-500">Add Yours Home to your phone's home screen</p>
                    </div>
                    <span className="btn-primary px-3 py-2">
                        <Download size={16} /> Install
                    </span>
                </button>
            )}

            {user.role === 'admin' && <BusinessSettings />}

            <button onClick={doLogout} className="btn-secondary w-full py-3 text-rose-600">
                <LogOut size={18} /> Log out
            </button>
        </div>
    );
}

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Eye, EyeOff, Loader2, Lock, ShieldCheck, User, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { BrandLogo } from '../components/Brand';

/**
 * Two separate login pages: the staff app (/staff/login) and the owner / admin panel (/admin/login).
 * Each one only accepts its own accounts and never shows the other.
 */
export default function Login({ portal = 'staff' }) {
    const isAdmin = portal === 'admin';
    const { sessions, login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ login: '', password: '' });
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState(null);

    if (sessions[portal]) return <Navigate to={`/${portal}`} replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.login, form.password, portal);
            navigate(`/${portal}`, { replace: true });
        } catch (err) {
            if (err.response?.status === 403 && err.response.data?.code) setAccount(err.response.data);
            else setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Brand panel (desktop) */}
            <div className="bg-brand-gradient relative hidden w-1/2 overflow-hidden lg:block">
                <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-300/20 blur-3xl" />
                <img src="/brand/emblem-white.png" alt="" className="pointer-events-none absolute -bottom-16 -right-16 w-96 opacity-[0.07]" />
                <div className="relative flex h-full flex-col justify-between p-12 text-white">
                    <BrandLogo white className="h-20 w-auto self-start" />
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Your happiness is our success</p>
                        <h2 className="mt-3 max-w-md text-4xl font-extrabold leading-tight">Hospital-quality care, delivered at home.</h2>
                        <p className="mt-4 max-w-md text-white/80">
                            Nurses, caretakers and nannies for your loved ones. Duty hours, shifts and payments, all in one place.
                        </p>
                        <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
                            {[
                                ['Live', 'Duty tracking'],
                                ['Easy', 'Staff app'],
                                ['Auto', 'Shift billing'],
                            ].map(([a, b]) => (
                                <div key={a} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                                    <p className="text-lg font-bold">{a}</p>
                                    <p className="text-xs text-white/75">{b}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="text-sm text-white/60">© {new Date().getFullYear()} Yours Home Healthcare</p>
                </div>
            </div>

            {/* Form */}
            <div className="safe-top flex flex-1 items-center justify-center bg-gradient-to-b from-accent-50 via-white to-brand-50 px-5 py-10 lg:bg-none">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
                        <BrandLogo className="mb-6 h-20 w-auto lg:hidden" />
                        {isAdmin && (
                            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">
                                <ShieldCheck size={13} /> Owner / Admin
                            </span>
                        )}
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{isAdmin ? 'Admin login' : 'Staff login'}</h1>
                        <p className="mt-2 text-slate-500">{isAdmin ? 'Sign in to manage staff, clients and payments' : 'Sign in to start your duty'}</p>
                    </div>

                    {account ? (
                        <div className="text-center">
                            {account.code === 'pending' ? (
                                <>
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                        <Clock size={30} />
                                    </div>
                                    <h2 className="text-xl font-extrabold text-slate-900">Waiting for admin approval</h2>
                                    <p className="mt-2 text-sm text-slate-600">
                                        Hi {account.name?.split(' ')[0]}, your application and documents are under review. This usually takes up to 24
                                        hours. You can log in as soon as the admin approves your account.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                                        <XCircle size={30} />
                                    </div>
                                    <h2 className="text-xl font-extrabold text-slate-900">Application not approved</h2>
                                    <p className="mt-2 text-sm text-slate-600">Sorry {account.name?.split(' ')[0]}, your application was not approved.</p>
                                    {account.reason && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Reason: {account.reason}</p>}
                                    <p className="mt-3 text-sm text-slate-500">Please contact the office for more details.</p>
                                </>
                            )}
                            <button className="btn-secondary mt-6 w-full" onClick={() => setAccount(null)}>
                                <ArrowLeft size={16} /> Back to login
                            </button>
                        </div>
                    ) : (
                    <>
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label className="label">{isAdmin ? 'Email or mobile number' : 'Mobile number'}</label>
                            <div className="relative">
                                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="input py-3 pl-11"
                                    value={form.login}
                                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                                    placeholder={isAdmin ? 'admin email' : '98765 43210'}
                                    inputMode={isAdmin ? 'email' : 'tel'}
                                    name={isAdmin ? 'admin-login' : 'staff-mobile'}
                                    autoComplete={isAdmin ? 'section-admin username' : 'section-staff username'}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="input py-3 pl-11 pr-11"
                                    type={show ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Enter your password"
                                    name={isAdmin ? 'admin-password' : 'staff-password'}
                                    autoComplete={isAdmin ? 'section-admin current-password' : 'section-staff current-password'}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShow(!show)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                >
                                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
                        )}

                        <button type="submit" className="btn-primary w-full py-3.5 text-base" disabled={loading}>
                            {loading && <Loader2 size={18} className="animate-spin" />}
                            Sign in
                        </button>
                    </form>

                    {!isAdmin && (
                        <div className="mt-6 rounded-2xl border border-accent-100 bg-accent-50/60 p-4 text-center">
                            <p className="text-sm font-semibold text-slate-700">New staff? Join our care team</p>
                            <Link to="/register" className="btn-secondary mt-3 w-full border-accent-200 text-accent-600">
                                <UserPlus size={18} /> Register as staff
                            </Link>
                        </div>
                    )}

                    <p className="mt-6 text-center text-xs text-slate-400">
                        {isAdmin ? 'Only the owner / admin can sign in here.' : 'Forgot your password? Please contact the office.'}
                    </p>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}

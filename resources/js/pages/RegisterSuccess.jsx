import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, LogIn, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../components/Brand';

export default function RegisterSuccess() {
    const { state } = useLocation();
    const firstName = state?.name?.split(' ')[0];

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

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Thank you{firstName ? `, ${firstName}` : ''}!</h1>
                <p className="mt-3 text-slate-600">Your application has been submitted successfully.</p>

                <div className="card mt-8 space-y-4 p-5 text-left">
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">Approval within 24 hours</p>
                            <p className="text-sm text-slate-500">Our admin team will review your application and documents and approve your account within 24 hours.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900">Then log in</p>
                            <p className="text-sm text-slate-500">
                                Once approved, log in with your mobile number (or email) and the password you just created.
                            </p>
                        </div>
                    </div>
                </div>

                <Link to="/staff/login" className="btn-primary mt-8 w-full py-3.5 text-base">
                    <LogIn size={18} /> Go to login
                </Link>
            </div>
        </div>
    );
}

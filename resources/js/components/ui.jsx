import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search, X, XCircle } from 'lucide-react';
import { initials } from '../lib/format';

/* ---------- Toasts ---------- */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((message, type = 'success') => {
        const id = Math.random().toString(36).slice(2);
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`animate-slide-up pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
                            t.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
                        }`}
                    >
                        {t.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} className="text-emerald-400" />}
                        <span className="flex-1">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Modal (bottom sheet on mobile) ---------- */

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;
    const width = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size];

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
            <div
                className={`animate-slide-up relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${width}`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="-mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                {footer && (
                    <div className="safe-bottom flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>
                )}
            </div>
        </div>
    );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Delete', loading }) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn-danger" onClick={onConfirm} disabled={loading}>
                        {loading && <Loader2 size={16} className="animate-spin" />} {confirmText}
                    </button>
                </>
            }
        >
            <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <AlertTriangle size={20} />
                </div>
                <p className="pt-2 text-sm text-slate-600">{message}</p>
            </div>
        </Modal>
    );
}

/* ---------- Small building blocks ---------- */

export function Field({ label, error, children, className = '', hint }) {
    return (
        <div className={className}>
            {label && <label className="label">{label}</label>}
            {children}
            {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
            {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
        </div>
    );
}

export function Spinner({ className = '' }) {
    return (
        <div className={`flex items-center justify-center py-16 ${className}`}>
            <Loader2 className="animate-spin text-brand-600" size={28} />
        </div>
    );
}

export function EmptyState({ icon: Icon, title, text, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            {Icon && (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon size={26} />
                </div>
            )}
            <h3 className="font-bold text-slate-800">{title}</h3>
            {text && <p className="mt-1 max-w-xs text-sm text-slate-500">{text}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

const avatarColors = [
    'bg-accent-100 text-accent-700',
    'bg-brand-100 text-brand-700',
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700',
    'bg-indigo-100 text-indigo-700',
];

export function Avatar({ name, size = 'md' }) {
    const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };
    const color = avatarColors[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full font-bold ${sizes[size]} ${color}`}>
            {initials(name)}
        </div>
    );
}

const statusStyles = {
    on_duty: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500', 'On Duty'],
    on_break: ['bg-amber-50 text-amber-700 ring-amber-600/20', 'bg-amber-500', 'On Break'],
    off_duty: ['bg-slate-100 text-slate-600 ring-slate-500/10', 'bg-slate-400', 'Off Duty'],
    completed: ['bg-slate-100 text-slate-600 ring-slate-500/10', 'bg-slate-400', 'Completed'],
    active: ['bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500', 'Active'],
    inactive: ['bg-slate-100 text-slate-500 ring-slate-500/10', 'bg-slate-400', 'Inactive'],
    cancelled: ['bg-rose-50 text-rose-700 ring-rose-600/20', 'bg-rose-500', 'Cancelled'],
};

export function StatusBadge({ status, label }) {
    const [cls, dot, text] = statusStyles[status] || statusStyles.off_duty;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label || text}
        </span>
    );
}

export function StatCard({ icon: Icon, label, value, tone = 'brand', sub }) {
    const tones = {
        brand: 'bg-brand-50 text-brand-600',
        green: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        sky: 'bg-sky-50 text-sky-600',
        violet: 'bg-violet-50 text-violet-600',
    };
    return (
        <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-slate-500">{label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
                    <Icon size={18} />
                </div>
            </div>
            <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
    );
}

export function PageHeader({ title, subtitle, action }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
    return (
        <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

export function Toggle({ checked, onChange, label }) {
    return (
        <label className="flex cursor-pointer items-center gap-3">
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
                />
            </button>
            <span className="text-sm font-medium text-slate-700">{label}</span>
        </label>
    );
}

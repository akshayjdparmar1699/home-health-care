import { CheckCircle2, Clock, Hourglass, IndianRupee, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import PushPrompt from '../components/PushPrompt';
import PayslipShareButton from '../components/PayslipShareButton';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, shiftLabel } from '../lib/format';
import { EmptyState, Spinner } from '../components/ui';
import { StaffPageHeader } from './StaffLayout';

export default function StaffEarnings() {
    const { data, loading } = useFetch('/staff/earnings');

    if (!data) return <Spinner className="min-h-[70vh]" />;
    const { summary, payouts, unsettled, awaiting_approval: awaiting = [] } = data;
    const due = summary.unsettled + summary.processing;

    return (
        <>
            <StaffPageHeader title="My Earnings" subtitle="You are paid per shift" />

            <div className="space-y-4 px-5">
                <div className="bg-brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-lg shadow-accent-500/20">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                    <p className="relative text-sm text-white/75">Earned this month</p>
                    <p className="relative mt-1 text-4xl font-extrabold tracking-tight">{formatMoney(summary.month_earned)}</p>
                    <p className="relative mt-1 text-sm text-white/75">{formatMinutes(summary.month_minutes)} of duty</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="card p-4">
                        <Hourglass size={18} className="text-amber-500" />
                        <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMoney(due)}</p>
                        <p className="text-[11px] font-semibold text-slate-400">TO BE PAID</p>
                    </div>
                    <div className="card p-4">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMoney(summary.paid_total)}</p>
                        <p className="text-[11px] font-semibold text-slate-400">TOTAL RECEIVED</p>
                    </div>
                </div>

                <PushPrompt title="Get notified about payments" text="We will tell you as soon as the admin approves your duty payment." />

                {awaiting.length > 0 && (
                    <div>
                        <div className="mb-2 flex items-center justify-between px-1">
                            <p className="text-sm font-bold text-slate-700">Waiting for admin approval</p>
                            <p className="text-xs font-semibold text-amber-600">{awaiting.length} dut{awaiting.length === 1 ? 'y' : 'ies'}</p>
                        </div>
                        <div className="card divide-y divide-slate-100">
                            {awaiting.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                        <ShieldCheck size={17} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{r.client || 'General duty'}</p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(r.duty_date, { weekday: 'short', year: undefined })} · {r.shift_hours ? shiftLabel(r.shift_hours, r.shift_type) : formatMinutes(r.worked_minutes)}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-amber-600">Pending</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-1.5 px-1 text-xs text-slate-400">The amount is added to your earnings once the admin approves it.</p>
                    </div>
                )}

                {/* Payments from admin */}
                <div>
                    <p className="mb-2 px-1 text-sm font-bold text-slate-700">Payments</p>
                    {payouts.length === 0 ? (
                        <div className="card">
                            <EmptyState icon={Wallet} title="No payments yet" text="When admin pays you, it will show here." />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {payouts.map((p) => (
                                <div key={p.id} className="card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800">
                                                {formatDate(p.period_from, { year: undefined })} - {formatDate(p.period_to)}
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {p.sessions} shift{p.sessions === 1 ? '' : 's'} · {formatMinutes(p.minutes)}
                                                {p.adjustment !== 0 && ` · ${p.adjustment > 0 ? 'Bonus' : 'Deduction'} ${formatMoney(Math.abs(p.adjustment))}`}
                                            </p>
                                        </div>
                                        <p className="text-lg font-extrabold text-slate-900">{formatMoney(p.amount)}</p>
                                    </div>
                                    {p.status === 'paid' ? (
                                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                                            <CheckCircle2 size={16} />
                                            Paid on {formatDate(p.paid_at)}
                                            {p.payment_method && <span className="font-normal">via {p.payment_method}</span>}
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                                            <Clock size={16} /> Payment processing
                                        </div>
                                    )}
                                    {p.notes && <p className="mt-2 text-xs text-slate-500">{p.notes}</p>}
                                    <PayslipShareButton payoutId={p.id} className="btn-secondary mt-3 w-full py-2 text-xs" label="View / share payment slip" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Not yet in any payment */}
                {unsettled.length > 0 && (
                    <div>
                        <div className="mb-2 flex items-center justify-between px-1">
                            <p className="text-sm font-bold text-slate-700">Not paid yet</p>
                            <p className="text-sm font-bold text-amber-600">{formatMoney(summary.unsettled)}</p>
                        </div>
                        <div className="card divide-y divide-slate-100">
                            {unsettled.map((r) => (
                                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-800">
                                            <MapPin size={13} className="shrink-0 text-slate-400" />
                                            {r.client?.name || 'General duty'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatDate(r.duty_date, { weekday: 'short', year: undefined })} · {r.shift_hours ? shiftLabel(r.shift_hours, r.shift_type) : 'Duty'} · {formatMinutes(r.worked_minutes)} worked
                                        </p>
                                    </div>
                                    <p className="font-bold text-slate-900">{formatMoney(r.staff_amount)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
                    <IndianRupee size={14} /> Each completed duty counts as one shift at the pay set by your admin.
                </p>
            </div>
        </>
    );
}

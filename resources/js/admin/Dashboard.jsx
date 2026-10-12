import { Link } from 'react-router-dom';
import { ClipboardList, Clock, Coffee, MapPin, Phone, ReceiptText, Stethoscope, TrendingUp, UserCheck, IndianRupee, UserRound, Users, Wallet } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { formatDate, formatMinutes, formatMoney, formatTime, greeting } from '../lib/format';
import { Avatar, EmptyState, Spinner, StatCard, StatusBadge } from '../components/ui';
import CheckInPhoto from './CheckInPhoto';

function WeekChart({ week }) {
    const max = Math.max(60, ...week.map((d) => d.minutes));
    return (
        <div className="flex h-44 items-end gap-2 sm:gap-3">
            {week.map((d, i) => {
                const pct = (d.minutes / max) * 100;
                const isToday = i === week.length - 1;
                return (
                    <div key={d.date} className="group flex flex-1 flex-col items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                            {formatMinutes(d.minutes)}
                        </span>
                        <div className="flex h-32 w-full items-end">
                            <div
                                className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-brand-600' : 'bg-brand-200 group-hover:bg-brand-300'}`}
                                style={{ height: `${Math.max(pct, 3)}%` }}
                                title={`${formatDate(d.date)}: ${formatMinutes(d.minutes)}`}
                            />
                        </div>
                        <span className={`text-xs font-semibold ${isToday ? 'text-brand-700' : 'text-slate-400'}`}>{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { data, loading } = useFetch('/admin/dashboard', null, { interval: 30000 });

    if (!data) return <Spinner />;
    const { stats, finance, live, not_started, week, recent } = data;

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm font-medium text-slate-500">{formatDate(new Date(), { weekday: 'long' })}</p>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    {greeting()}, {user.name.split(' ')[0]} 👋
                </h1>
            </div>

            {stats.pending_approvals > 0 && (
                <Link to="/admin/attendance?approval=pending" className="flex items-center gap-3 rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-200 transition hover:bg-accent-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-white">
                        <IndianRupee size={20} />
                    </span>
                    <span className="flex-1 text-sm text-accent-900">
                        <b>
                            {stats.pending_approvals} finished dut{stats.pending_approvals === 1 ? 'y' : 'ies'}
                        </b>{' '}
                        waiting for payment approval
                    </span>
                    <span className="text-sm font-bold text-accent-700">Approve</span>
                </Link>
            )}

            {stats.pending_applications > 0 && (
                <Link to="/admin/applications" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 transition hover:bg-amber-100">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                        <UserCheck size={20} />
                    </span>
                    <span className="flex-1 text-sm text-amber-900">
                        <b>
                            {stats.pending_applications} new staff application{stats.pending_applications === 1 ? '' : 's'}
                        </b>{' '}
                        waiting for your approval
                    </span>
                    <span className="text-sm font-bold text-amber-800">Review</span>
                </Link>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard icon={Stethoscope} label="On duty now" value={stats.on_duty} tone="green" sub={`${stats.on_break} on break`} />
                <StatCard icon={Clock} label="Hours today" value={formatMinutes(stats.today_minutes)} tone="brand" sub="Across all staff" />
                <StatCard icon={Users} label="Active staff" value={stats.total_staff} tone="sky" sub={`${stats.active_assignments} assignments`} />
                <StatCard icon={UserRound} label="Active clients" value={stats.total_clients} tone="violet" sub="Receiving care" />
            </div>

            <div className="card overflow-hidden">
                <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <Link to="/admin/reports" className="flex items-center gap-4 p-5 hover:bg-slate-50/60">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-slate-500">Profit this month</p>
                            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(finance.month_profit)}</p>
                            <p className="text-xs text-slate-400">
                                {formatMoney(finance.month_revenue)} revenue - {formatMoney(finance.month_cost)} staff cost
                            </p>
                        </div>
                    </Link>
                    <Link to="/admin/billing" className="flex items-center gap-4 p-5 hover:bg-slate-50/60">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                            <ReceiptText size={22} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-slate-500">To collect from clients</p>
                            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(finance.client_unpaid + finance.client_unbilled)}</p>
                            <p className="text-xs text-slate-400">
                                {formatMoney(finance.client_unpaid)} unpaid bills · {formatMoney(finance.client_unbilled)} not billed
                            </p>
                        </div>
                    </Link>
                    <Link to="/admin/payouts" className="flex items-center gap-4 p-5 hover:bg-slate-50/60">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <Wallet size={22} />
                        </div>
                        <div>
                            <p className="text-[13px] font-semibold text-slate-500">To pay staff</p>
                            <p className="text-2xl font-extrabold text-slate-900">{formatMoney(finance.staff_payable)}</p>
                            <p className="text-xs text-slate-400">Earned but not paid yet</p>
                        </div>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Live duty board */}
                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5 text-emerald-500">
                                <span className="pulse-ring relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <h2 className="font-bold text-slate-900">Live duty board</h2>
                        </div>
                        <span className="text-xs font-medium text-slate-400">Auto-refreshes</span>
                    </div>
                    {live.length === 0 ? (
                        <EmptyState icon={Coffee} title="Nobody is on duty right now" text="Staff will appear here as soon as they start their duty." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {live.map((a) => (
                                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                    {a.has_selfie ? <CheckInPhoto attendance={a} /> : <Avatar name={a.staff?.name} />}
                                    <Link to={`/admin/staff/${a.staff_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">{a.staff?.name}</p>
                                            <p className="truncate text-sm text-slate-500">
                                                {a.staff?.designation} {a.client && <>· at <span className="font-medium text-slate-700">{a.client.name}</span></>}
                                            </p>
                                        </div>
                                    </Link>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 pl-[52px] sm:pl-0">
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-slate-400">Since {formatTime(a.clock_in)}</p>
                                            <p className="text-sm">
                                                <span className="font-bold text-slate-900">{formatMinutes(a.live_worked_minutes)}</span> <span className="text-slate-400">worked</span>
                                            </p>
                                        </div>
                                        <StatusBadge status={a.status} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Not started */}
                <div className="card">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">Not started yet today</h2>
                        <p className="text-xs text-slate-400">Assigned staff without a duty today</p>
                    </div>
                    {not_started.length === 0 ? (
                        <EmptyState icon={ClipboardList} title="All caught up" text="Every assigned staff has started duty today." />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {not_started.map((a) => (
                                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                                    <Avatar name={a.staff?.name} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{a.staff?.name}</p>
                                        <p className="truncate text-xs text-slate-400">For {a.client?.name}</p>
                                    </div>
                                    <a href={`tel:${a.staff?.phone}`} className="rounded-full bg-brand-50 p-2 text-brand-700 hover:bg-brand-100">
                                        <Phone size={15} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="card p-5 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Hours worked this week</h2>
                            <p className="text-xs text-slate-400">Completed duties, all staff</p>
                        </div>
                        <p className="text-lg font-extrabold text-brand-700">{formatMinutes(week.reduce((s, d) => s + d.minutes, 0))}</p>
                    </div>
                    <WeekChart week={week} />
                </div>

                <div className="card">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">Recently completed</h2>
                        <Link to="/admin/attendance" className="text-xs font-semibold text-brand-700 hover:underline">
                            View all
                        </Link>
                    </div>
                    {recent.length === 0 ? (
                        <EmptyState icon={Clock} title="No duties yet" />
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {recent.map((a) => (
                                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{a.staff?.name}</p>
                                        <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                                            <MapPin size={11} /> {a.client?.name || 'No client'} · {formatDate(a.duty_date, { year: undefined })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{formatMinutes(a.worked_minutes)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

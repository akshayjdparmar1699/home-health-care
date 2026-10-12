import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, IndianRupee, MapPin, PiggyBank, TrendingUp, Wallet } from 'lucide-react';
import useFetch from '../lib/useFetch';
import useCities from '../lib/useCities';
import { daysAgoISO, formatMinutes, formatMoney, lastMonthRange, monthStartISO, todayISO } from '../lib/format';
import { EmptyState, Field, PageHeader, Spinner, StatCard } from '../components/ui';

const presets = () => [
    ['This month', [monthStartISO(), todayISO()]],
    ['Last month', lastMonthRange()],
    ['Last 90 days', [daysAgoISO(89), todayISO()]],
    ['This year', [todayISO().slice(0, 4) + '-01-01', todayISO()]],
];

function Profit({ value }) {
    return <span className={`font-bold ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(value)}</span>;
}

function margin(row) {
    return row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0;
}

export default function Reports() {
    const cities = useCities();
    const [filters, setFilters] = useState({ from: monthStartISO(), to: todayISO(), city: '' });
    const [tab, setTab] = useState('client');
    const { data, loading } = useFetch('/admin/reports', filters);

    const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
    const maxCity = data ? Math.max(1, ...data.by_city.map((c) => c.revenue)) : 1;

    return (
        <>
            <PageHeader title="Reports & Profit" subtitle="How each city, client and staff is performing" />

            <div className="card mb-5 space-y-3 p-4">
                <div className="flex flex-wrap gap-2">
                    {presets().map(([label, [f, t]]) => (
                        <button
                            key={label}
                            onClick={() => setFilters({ ...filters, from: f, to: t })}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                filters.from === f && filters.to === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <Field label="From">
                        <input type="date" className="input" value={filters.from} onChange={set('from')} />
                    </Field>
                    <Field label="To">
                        <input type="date" className="input" value={filters.to} onChange={set('to')} />
                    </Field>
                    <Field label="City" className="col-span-2 lg:col-span-1">
                        <select className="input" value={filters.city} onChange={set('city')}>
                            <option value="">All cities</option>
                            {cities.map((c) => (
                                <option key={c}>{c}</option>
                            ))}
                        </select>
                    </Field>
                </div>
            </div>

            {!data ? (
                <Spinner />
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <StatCard icon={IndianRupee} label="Revenue (client charges)" value={formatMoney(data.totals.revenue)} tone="sky" />
                        <StatCard icon={Wallet} label="Staff cost" value={formatMoney(data.totals.cost)} tone="amber" />
                        <StatCard
                            icon={TrendingUp}
                            label="Profit"
                            value={formatMoney(data.totals.profit)}
                            tone="green"
                            sub={`${margin(data.totals)}% margin`}
                        />
                        <StatCard icon={Clock} label="Hours of care" value={formatMinutes(data.totals.minutes)} sub={`${data.totals.sessions} visits`} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            ['Client bills unpaid', data.outstanding.client_unpaid, '/admin/billing', 'text-sky-700'],
                            ['Work not billed yet', data.outstanding.client_unbilled, '/admin/billing', 'text-amber-700'],
                            ['Staff payouts pending', data.outstanding.staff_pending, '/admin/payouts', 'text-violet-700'],
                            ['Staff earned, not paid', data.outstanding.staff_unsettled, '/admin/payouts', 'text-rose-700'],
                        ].map(([label, value, to, color]) => (
                            <Link key={label} to={to} className="card flex items-center justify-between p-4 transition hover:border-brand-200">
                                <span className="text-sm font-medium text-slate-500">{label}</span>
                                <span className={`text-lg font-extrabold ${color}`}>{formatMoney(value)}</span>
                            </Link>
                        ))}
                    </div>

                    {/* City-wise */}
                    <div className="card">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                            <MapPin size={18} className="text-brand-600" />
                            <h2 className="font-bold text-slate-900">City-wise performance</h2>
                        </div>
                        {data.by_city.length === 0 ? (
                            <EmptyState icon={MapPin} title="No completed duties in this period" />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {data.by_city.map((c) => (
                                    <li key={c.city || 'none'} className="px-5 py-4">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <button
                                                onClick={() => c.city && setFilters({ ...filters, city: c.city })}
                                                className="text-left font-bold text-slate-900 hover:text-brand-700"
                                            >
                                                {c.city || 'City not set'}
                                            </button>
                                            <p className="text-sm">
                                                <span className="text-slate-500">Profit </span>
                                                <Profit value={c.profit} />
                                                <span className="text-slate-400"> ({margin(c)}%)</span>
                                            </p>
                                        </div>
                                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.revenue / maxCity) * 100}%` }} />
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-5">
                                            <span>
                                                Revenue <b className="text-slate-800">{formatMoney(c.revenue)}</b>
                                            </span>
                                            <span>
                                                Cost <b className="text-slate-800">{formatMoney(c.cost)}</b>
                                            </span>
                                            <span>
                                                Hours <b className="text-slate-800">{formatMinutes(c.minutes)}</b>
                                            </span>
                                            <span>
                                                Clients <b className="text-slate-800">{c.clients}</b>
                                                {c.active_clients > c.clients && ` / ${c.active_clients} active`}
                                            </span>
                                            <span>
                                                Staff <b className="text-slate-800">{c.staff}</b>
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Client / staff breakdown */}
                    <div className="card overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">Breakdown</h2>
                            <div className="flex rounded-xl bg-slate-100 p-1">
                                {[
                                    ['client', 'Client-wise'],
                                    ['staff', 'Staff-wise'],
                                ].map(([v, l]) => (
                                    <button
                                        key={v}
                                        onClick={() => setTab(v)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="table-wrap">
                            {tab === 'client' ? (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Client</th>
                                            <th>City</th>
                                            <th className="text-right">Hours</th>
                                            <th className="text-right">Revenue</th>
                                            <th className="text-right">Staff cost</th>
                                            <th className="text-right">Profit</th>
                                            <th className="text-right">Not billed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_client.map((r) => (
                                            <tr key={r.client_id || 'none'}>
                                                <td className="font-semibold">
                                                    {r.client_id ? (
                                                        <Link to={`/admin/clients/${r.client_id}`} className="hover:text-brand-700">
                                                            {r.name}
                                                        </Link>
                                                    ) : (
                                                        r.name
                                                    )}
                                                </td>
                                                <td className="text-slate-500">{r.city || '-'}</td>
                                                <td className="text-right">{formatMinutes(r.minutes)}</td>
                                                <td className="text-right">{formatMoney(r.revenue)}</td>
                                                <td className="text-right text-slate-500">{formatMoney(r.cost)}</td>
                                                <td className="text-right">
                                                    <Profit value={r.profit} />
                                                </td>
                                                <td className="text-right text-amber-700">{r.unbilled ? formatMoney(r.unbilled) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Staff</th>
                                            <th className="text-right">Visits</th>
                                            <th className="text-right">Hours</th>
                                            <th className="text-right">Earned</th>
                                            <th className="text-right">Billed to clients</th>
                                            <th className="text-right">Profit</th>
                                            <th className="text-right">Not paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.by_staff.map((r) => (
                                            <tr key={r.staff_id}>
                                                <td>
                                                    <Link to={`/admin/staff/${r.staff_id}`} className="font-semibold hover:text-brand-700">
                                                        {r.name}
                                                    </Link>
                                                    <p className="text-xs text-slate-400">{r.designation}</p>
                                                </td>
                                                <td className="text-right">{r.sessions}</td>
                                                <td className="text-right">{formatMinutes(r.minutes)}</td>
                                                <td className="text-right">{formatMoney(r.cost)}</td>
                                                <td className="text-right text-slate-500">{formatMoney(r.revenue)}</td>
                                                <td className="text-right">
                                                    <Profit value={r.profit} />
                                                </td>
                                                <td className="text-right text-rose-700">{r.unsettled ? formatMoney(r.unsettled) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                        <PiggyBank size={14} /> Figures are based on completed duties in the selected period, using the rates at the time of the duty.
                    </p>
                </div>
            )}
        </>
    );
}

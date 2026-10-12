import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight, FilePlus2, ReceiptText } from 'lucide-react';
import useFetch from '../lib/useFetch';
import useCities from '../lib/useCities';
import { formatDate, formatMinutes, formatMoney } from '../lib/format';
import { EmptyState, PageHeader, SearchInput, Spinner, StatCard, StatusBadge } from '../components/ui';

export default function Billing() {
    const navigate = useNavigate();
    const cities = useCities();
    const [filters, setFilters] = useState({ status: '', city: '', search: '' });
    const { data, loading } = useFetch('/admin/invoices', filters);

    return (
        <>
            <PageHeader
                title="Client Bills"
                subtitle="Create bills from duty hours and track payments"
                action={
                    <Link to="/admin/billing/new" className="btn-primary">
                        <FilePlus2 size={18} /> Create bill
                    </Link>
                }
            />

            {!data ? (
                <Spinner />
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        <StatCard icon={AlertCircle} label="Work not billed yet" value={formatMoney(data.summary.unbilled)} tone="amber" />
                        <StatCard icon={ReceiptText} label="Bills unpaid" value={formatMoney(data.summary.unpaid)} tone="sky" sub="Waiting for client payment" />
                        <StatCard icon={CheckCircle2} label="Received this month" value={formatMoney(data.summary.paid_this_month)} tone="green" />
                    </div>

                    {data.unbilled.length > 0 && (
                        <div className="card">
                            <div className="border-b border-slate-100 px-5 py-4">
                                <h2 className="font-bold text-slate-900">Ready to bill</h2>
                                <p className="text-xs text-slate-400">Completed duty hours not added to any bill</p>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {data.unbilled.map((u) => (
                                    <li key={u.client_id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-800">{u.client?.name}</p>
                                            <p className="text-xs text-slate-500">
                                                {u.client?.city || 'No city'} · {u.sessions} visits · {formatMinutes(u.minutes)} · {formatDate(u.from, { year: undefined })} to{' '}
                                                {formatDate(u.to, { year: undefined })}
                                            </p>
                                        </div>
                                        <p className="text-lg font-extrabold text-slate-900">{formatMoney(u.amount)}</p>
                                        <button
                                            className="btn-primary px-3 py-2"
                                            onClick={() => navigate(`/admin/billing/new?client_id=${u.client_id}&from=${u.from}&to=${u.to}`)}
                                        >
                                            Bill now
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="card">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                            <h2 className="font-bold text-slate-900 sm:mr-auto">All bills</h2>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <SearchInput value={filters.search} onChange={(v) => setFilters({ ...filters, search: v })} placeholder="Bill no. or client" />
                                <select className="input sm:w-36" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}>
                                    <option value="">All cities</option>
                                    {cities.map((c) => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                                <select className="input sm:w-32" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                                    <option value="">All</option>
                                    <option value="unpaid">Unpaid</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>
                        </div>
                        {data.invoices.length === 0 ? (
                            <EmptyState icon={ReceiptText} title="No bills yet" text="Create a bill from a client's completed duty hours." />
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {data.invoices.map((inv) => (
                                    <li key={inv.id}>
                                        <Link to={`/admin/billing/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                                                <ReceiptText size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-800">
                                                    {inv.client?.name} <span className="font-normal text-slate-400">· {inv.invoice_no}</span>
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {inv.client?.city || 'No city'} · {formatDate(inv.period_from, { year: undefined })} - {formatDate(inv.period_to)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-extrabold text-slate-900">{formatMoney(inv.total)}</p>
                                                <StatusBadge status={inv.status === 'paid' ? 'active' : 'cancelled'} label={inv.status === 'paid' ? 'Paid' : 'Unpaid'} />
                                            </div>
                                            <ChevronRight size={18} className="text-slate-300" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, HeartHandshake, MapPin, Phone, Plus, UserRound } from 'lucide-react';
import useFetch from '../lib/useFetch';
import useCities from '../lib/useCities';
import { Avatar, EmptyState, PageHeader, SearchInput, Spinner, StatusBadge } from '../components/ui';
import ViewToggle, { useSavedView } from '../components/ViewToggle';
import ClientForm from './ClientForm';

const ageGender = (c) => [c.age && `${c.age} yrs`, c.gender && c.gender[0].toUpperCase() + c.gender.slice(1)].filter(Boolean).join(' · ');

function ClientCards({ clients }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((c) => (
                <Link key={c.id} to={`/admin/clients/${c.id}`} className="card flex flex-col p-4 transition hover:border-brand-200 hover:shadow-md">
                    <div className="flex items-start gap-3">
                        <Avatar name={c.name} />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="truncate font-bold text-slate-900">{c.name}</p>
                                {!c.is_active && <StatusBadge status="inactive" />}
                            </div>
                            <p className="text-sm text-slate-500">{ageGender(c) || 'Patient'}</p>
                        </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.service_type && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                                <HeartHandshake size={13} /> {c.service_type}
                            </span>
                        )}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                        <p className="flex items-start gap-2">
                            <MapPin size={15} className="mt-0.5 shrink-0" />
                            <span className="line-clamp-2">
                                {c.address}
                                {c.city && `, ${c.city}`}
                            </span>
                        </p>
                        <p className="flex items-center gap-2">
                            <Phone size={15} /> {c.phone}
                        </p>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                        {c.assignments.length === 0 ? (
                            <p className="text-xs font-semibold text-amber-600">No staff assigned</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {c.assignments.map((a) => (
                                    <span key={a.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                        {a.staff?.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </Link>
            ))}
        </div>
    );
}

function ClientTable({ clients }) {
    const navigate = useNavigate();

    return (
        <div className="card overflow-hidden">
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Mobile</th>
                            <th>City / Area</th>
                            <th>Service</th>
                            <th>Care team</th>
                            <th>Account</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((c) => (
                            <tr key={c.id} onClick={() => navigate(`/admin/clients/${c.id}`)} className="cursor-pointer transition hover:bg-brand-50/40">
                                <td>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={c.name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">{c.name}</p>
                                            <p className="text-xs text-slate-500">{ageGender(c) || 'Patient'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-brand-700">
                                        <Phone size={13} /> {c.phone}
                                    </a>
                                </td>
                                <td>
                                    <p className="flex items-center gap-1 font-medium text-slate-700">
                                        <MapPin size={13} className="shrink-0 text-slate-400" /> {c.city || <span className="text-slate-300">No city</span>}
                                    </p>
                                    <p className="max-w-[220px] truncate text-xs text-slate-500" title={c.address}>
                                        {c.address}
                                    </p>
                                </td>
                                <td>
                                    {c.service_type ? (
                                        <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">{c.service_type}</span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td>
                                    {c.assignments.length === 0 ? (
                                        <span className="text-xs font-semibold text-amber-600">No staff assigned</span>
                                    ) : (
                                        <div className="flex max-w-[240px] flex-wrap gap-1">
                                            {c.assignments.map((a) => (
                                                <span key={a.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    {a.staff?.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <StatusBadge status={c.is_active ? 'active' : 'inactive'} />
                                    {c.source === 'self' && <span className="ml-1.5 rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700">Filled by client</span>}
                                </td>
                                <td className="text-right">
                                    <ChevronRight size={18} className="inline text-slate-300" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ClientList() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [city, setCity] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [view, setView] = useSavedView('hc_client_view');
    const cities = useCities();
    const { data, reload } = useFetch('/admin/clients', { search, status, city });

    return (
        <>
            <PageHeader
                title="Clients"
                subtitle="Patients receiving care at home"
                action={
                    <button className="btn-primary" onClick={() => setFormOpen(true)}>
                        <Plus size={18} /> Add client
                    </button>
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone, area or city" />
                <div className="flex gap-3">
                    <select className="input flex-1 sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All clients</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <ViewToggle view={view} onChange={setView} />
                </div>
            </div>

            {cities.length > 0 && (
                <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                    {[['', 'All cities'], ...cities.map((c) => [c, c]), ['__none', 'No city']].map(([value, label]) => (
                        <button
                            key={label}
                            onClick={() => setCity(value)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                city === value ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {!data ? (
                <Spinner />
            ) : data.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={UserRound}
                        title={search ? 'No clients found' : 'No clients added yet'}
                        text={search ? 'Try a different search.' : 'Add a patient and assign staff to them.'}
                        action={
                            !search && (
                                <button className="btn-primary" onClick={() => setFormOpen(true)}>
                                    <Plus size={18} /> Add client
                                </button>
                            )
                        }
                    />
                </div>
            ) : (
                <>
                    <p className="mb-2 text-xs font-medium text-slate-400">
                        {data.length} client{data.length === 1 ? '' : 's'}
                    </p>
                    {view === 'table' ? <ClientTable clients={data} /> : <ClientCards clients={data} />}
                </>
            )}

            <ClientForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => reload(true)} />
        </>
    );
}

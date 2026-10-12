import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Phone, Plus, Users } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { formatDate } from '../lib/format';
import { Avatar, EmptyState, PageHeader, SearchInput, Spinner, StatusBadge } from '../components/ui';
import ViewToggle, { useSavedView } from '../components/ViewToggle';

function StaffCards({ staff }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {staff.map((s) => (
                <Link key={s.id} to={`/admin/staff/${s.id}`} className="card group flex items-center gap-4 p-4 transition hover:border-brand-200 hover:shadow-md">
                    <Avatar name={s.name} size="lg" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="truncate font-bold text-slate-900">{s.name}</p>
                            {!s.is_active && <StatusBadge status="inactive" />}
                        </div>
                        <p className="truncate text-sm text-slate-500">
                            {s.designation || 'Staff'}
                            {s.city && ` · ${s.city}`}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StatusBadge status={s.duty_status} />
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Phone size={12} /> {s.phone}
                            </span>
                        </div>
                        {s.duty_client && <p className="mt-1.5 truncate text-xs text-slate-500">At {s.duty_client}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            {s.active_assignments_count} client{s.active_assignments_count === 1 ? '' : 's'}
                        </span>
                        <ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                    </div>
                </Link>
            ))}
        </div>
    );
}

function StaffTable({ staff }) {
    const navigate = useNavigate();

    return (
        <div className="card overflow-hidden">
            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Staff</th>
                            <th>Mobile</th>
                            <th>City</th>
                            <th>Right now</th>
                            <th className="text-center">Clients</th>
                            <th>Joined</th>
                            <th>Account</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map((s) => (
                            <tr key={s.id} onClick={() => navigate(`/admin/staff/${s.id}`)} className="cursor-pointer transition hover:bg-brand-50/40">
                                <td>
                                    <div className="flex items-center gap-3">
                                        <Avatar name={s.name} size="sm" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900">{s.name}</p>
                                            <p className="text-xs text-slate-500">{s.designation || 'Staff'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <a href={`tel:${s.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-brand-700">
                                        <Phone size={13} /> {s.phone}
                                    </a>
                                </td>
                                <td className="text-slate-600">
                                    {s.city ? (
                                        <span className="inline-flex items-center gap-1">
                                            <MapPin size={13} className="text-slate-400" /> {s.city}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex flex-col items-start gap-1">
                                        <StatusBadge status={s.duty_status} />
                                        {s.duty_client && <span className="max-w-[160px] truncate text-xs text-slate-500">At {s.duty_client}</span>}
                                    </div>
                                </td>
                                <td className="text-center">
                                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{s.active_assignments_count}</span>
                                </td>
                                <td className="text-slate-600">{s.joining_date ? formatDate(s.joining_date) : <span className="text-slate-300">-</span>}</td>
                                <td>
                                    <StatusBadge status={s.is_active ? 'active' : 'inactive'} />
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

export default function StaffList() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [view, setView] = useSavedView('hc_staff_view');
    const navigate = useNavigate();
    const { data } = useFetch('/admin/staff', { search, status });

    return (
        <>
            <PageHeader
                title="Staff"
                subtitle="Nurses, caretakers and nannies working with you"
                action={
                    <button className="btn-primary" onClick={() => navigate('/admin/staff/new')}>
                        <Plus size={18} /> Add staff
                    </button>
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone or role" />
                <div className="flex gap-3">
                    <select className="input flex-1 sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All staff</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                    <ViewToggle view={view} onChange={setView} />
                </div>
            </div>

            {!data ? (
                <Spinner />
            ) : data.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Users}
                        title={search ? 'No staff found' : 'No staff added yet'}
                        text={search ? 'Try a different search.' : 'Add your first nurse or caretaker to get started.'}
                        action={
                            !search && (
                                <button className="btn-primary" onClick={() => navigate('/admin/staff/new')}>
                                    <Plus size={18} /> Add staff
                                </button>
                            )
                        }
                    />
                </div>
            ) : (
                <>
                    <p className="mb-2 text-xs font-medium text-slate-400">
                        {data.length} staff member{data.length === 1 ? '' : 's'}
                    </p>
                    {view === 'table' ? <StaffTable staff={data} /> : <StaffCards staff={data} />}
                </>
            )}
        </>
    );
}

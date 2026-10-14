import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, Inbox, Loader2, MessageCircle, Pencil, Phone, Plus, Trash2, UserRound, Users } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, todayISO } from '../lib/format';
import { DESIGNATIONS } from '../lib/staffForm';
import { SERVICES } from './ClientForm';
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader, SearchInput, Spinner, useToast } from '../components/ui';

const STATUSES = [
    ['new', 'New', 'bg-sky-50 text-sky-700 ring-sky-200'],
    ['follow_up', 'Follow-up', 'bg-amber-50 text-amber-700 ring-amber-200'],
    ['converted', 'Converted', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
    ['not_interested', 'Not interested', 'bg-slate-100 text-slate-500 ring-slate-200'],
];
const statusOf = (s) => STATUSES.find(([v]) => v === s) || STATUSES[0];
const SOURCES = ['Call', 'WhatsApp', 'Walk-in', 'Reference', 'Website', 'Social media', 'Other'];

const TABS = {
    staff: { label: 'Staff', icon: Users, endpoint: '/admin/leads/staff', add: 'Add staff lead', noun: 'staff lead' },
    clients: { label: 'Clients', icon: UserRound, endpoint: '/admin/leads/clients', add: 'Add client lead', noun: 'client lead' },
};

const emptyLead = (tab) => ({
    name: '',
    phone: '',
    city: '',
    source: '',
    status: 'new',
    follow_up_date: '',
    notes: '',
    ...(tab === 'staff' ? { role: '', experience: '' } : { patient_name: '', service: '' }),
});

const waLink = (phone) => {
    const d = String(phone || '').replace(/\D/g, '');
    return d ? `https://wa.me/${d.length === 10 ? `91${d}` : d}` : null;
};

function LeadForm({ tab, lead, open, onClose, onSaved }) {
    const toast = useToast();
    const [form, setForm] = useState(emptyLead(tab));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const isStaff = tab === 'staff';

    useEffect(() => {
        if (!open) return;
        setErrors({});
        setForm(lead ? { ...emptyLead(tab), ...Object.fromEntries(Object.entries(lead).map(([k, v]) => [k, v ?? ''])) } : emptyLead(tab));
    }, [open, lead, tab]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]));
        try {
            if (lead) await api.put(`${TABS[tab].endpoint}/${lead.id}`, payload);
            else await api.post(TABS[tab].endpoint, payload);
            toast(lead ? 'Lead updated' : 'Lead added');
            onSaved();
            onClose();
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(Object.fromEntries(Object.entries(err.response.data.errors).map(([k, v]) => [k, v[0]])));
            } else toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={lead ? `Edit ${TABS[tab].noun}` : TABS[tab].add}
            subtitle={isStaff ? 'Someone asking for a job' : 'A family asking about care'}
            footer={
                <>
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button form="lead-form" className="btn-primary" disabled={saving}>
                        {saving && <Loader2 size={16} className="animate-spin" />} {lead ? 'Save' : 'Add lead'}
                    </button>
                </>
            }
        >
            <form id="lead-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label={isStaff ? 'Name *' : 'Contact person *'} error={errors.name}>
                    <input className="input" value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Mobile *" error={errors.phone}>
                    <input className="input" type="tel" inputMode="numeric" value={form.phone} onChange={set('phone')} required />
                </Field>
                {isStaff ? (
                    <>
                        <Field label="Role / work" error={errors.role}>
                            <input className="input" list="lead-roles" value={form.role} onChange={set('role')} placeholder="Select or type" />
                            <datalist id="lead-roles">
                                {DESIGNATIONS.map((d) => (
                                    <option key={d} value={d} />
                                ))}
                            </datalist>
                        </Field>
                        <Field label="Experience" error={errors.experience}>
                            <input className="input" value={form.experience} onChange={set('experience')} placeholder="e.g. 2 years, Fresher" />
                        </Field>
                    </>
                ) : (
                    <>
                        <Field label="Patient name" error={errors.patient_name}>
                            <input className="input" value={form.patient_name} onChange={set('patient_name')} />
                        </Field>
                        <Field label="Service needed" error={errors.service}>
                            <input className="input" list="lead-services" value={form.service} onChange={set('service')} placeholder="Select or type" />
                            <datalist id="lead-services">
                                {SERVICES.map((d) => (
                                    <option key={d} value={d} />
                                ))}
                            </datalist>
                        </Field>
                    </>
                )}
                <Field label="City" error={errors.city}>
                    <input className="input" value={form.city} onChange={set('city')} />
                </Field>
                <Field label="Came from" error={errors.source}>
                    <select className="input" value={form.source} onChange={set('source')}>
                        <option value="">Select</option>
                        {SOURCES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Status" error={errors.status}>
                    <select className="input" value={form.status} onChange={set('status')}>
                        {STATUSES.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Follow-up date" error={errors.follow_up_date}>
                    <input type="date" className="input" value={form.follow_up_date} onChange={set('follow_up_date')} />
                </Field>
                <Field label="Notes" error={errors.notes} className="sm:col-span-2">
                    <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder={isStaff ? 'Salary expected, area, timing...' : 'Patient condition, shift needed, budget...'} />
                </Field>
            </form>
        </Modal>
    );
}

/** Leads: rough staff / client inquiries, kept apart from real staff and clients. */
export default function Leads() {
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'clients' ? 'clients' : 'staff';
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState(null); // null closed, {} new, lead = edit
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { data, reload } = useFetch(TABS[tab].endpoint, { status, search: query });
    const isStaff = tab === 'staff';

    useEffect(() => {
        const t = setTimeout(() => setQuery(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const switchTab = (next) => {
        setStatus('');
        setSearch('');
        setParams(next === 'staff' ? {} : { tab: next }, { replace: true });
    };

    const changeStatus = async (lead, next) => {
        try {
            await api.put(`${TABS[tab].endpoint}/${lead.id}`, { ...lead, status: next });
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        }
    };

    const remove = async () => {
        setDeleting(true);
        try {
            await api.delete(`${TABS[tab].endpoint}/${toDelete.id}`);
            toast('Lead deleted');
            setToDelete(null);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setDeleting(false);
        }
    };

    const counts = data?.counts || {};
    const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
    const today = todayISO();
    const detail = (l) => (isStaff ? [l.role, l.experience] : [l.patient_name && `Patient: ${l.patient_name}`, l.service]).filter(Boolean).join(' · ');

    const Actions = ({ lead }) => (
        <div className="flex shrink-0 justify-end gap-1">
            <a href={`tel:${lead.phone}`} className="btn-ghost px-2 py-1 text-brand-700" title="Call">
                <Phone size={14} />
            </a>
            {waLink(lead.phone) && (
                <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" className="btn-ghost px-2 py-1 text-[#128c4b]" title="WhatsApp">
                    <MessageCircle size={14} />
                </a>
            )}
            <button className="btn-ghost px-2 py-1" onClick={() => setEditing(lead)} title="Edit">
                <Pencil size={14} />
            </button>
            <button className="btn-ghost px-2 py-1 text-rose-600" onClick={() => setToDelete(lead)} title="Delete">
                <Trash2 size={14} />
            </button>
        </div>
    );

    const StatusSelect = ({ lead }) => (
        <select
            value={lead.status}
            onChange={(e) => changeStatus(lead, e.target.value)}
            className={`cursor-pointer rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-semibold ring-1 ring-inset ${statusOf(lead.status)[2]}`}
            aria-label="Change status"
        >
            {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                    {l}
                </option>
            ))}
        </select>
    );

    const FollowUp = ({ lead }) =>
        lead.follow_up_date ? (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${lead.follow_up_date <= today && lead.status !== 'converted' && lead.status !== 'not_interested' ? 'text-rose-600' : 'text-slate-500'}`}>
                <CalendarClock size={12} /> {formatDate(lead.follow_up_date, { year: undefined })}
            </span>
        ) : null;

    return (
        <>
            <PageHeader
                title="Leads"
                subtitle="Staff and client inquiries. Not added as real staff or clients."
                action={
                    <button className="btn-primary" onClick={() => setEditing({})}>
                        <Plus size={18} /> {TABS[tab].add}
                    </button>
                }
            />

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex rounded-xl bg-slate-100 p-1">
                    {Object.entries(TABS).map(([key, t]) => (
                        <button
                            key={key}
                            onClick={() => switchTab(key)}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <t.icon size={15} /> {t.label}
                        </button>
                    ))}
                </div>
                <SearchInput value={search} onChange={setSearch} placeholder={isStaff ? 'Search name, mobile, city, role' : 'Search name, mobile, city, patient'} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {[['', 'All', total], ...STATUSES.map(([v, l]) => [v, l, Number(counts[v] || 0)])].map(([v, l, n]) => (
                    <button
                        key={v || 'all'}
                        onClick={() => setStatus(v)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${status === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {l} ({n})
                    </button>
                ))}
            </div>

            {!data ? (
                <Spinner />
            ) : data.leads.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Inbox}
                        title={query || status ? 'No leads match' : `No ${TABS[tab].noun}s yet`}
                        text={query || status ? 'Try another search or status.' : `Tap "${TABS[tab].add}" when someone calls or messages.`}
                    />
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="card hidden overflow-hidden md:block">
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{isStaff ? 'Name' : 'Contact'}</th>
                                        <th>Mobile / city</th>
                                        <th>{isStaff ? 'Role / experience' : 'Patient / service'}</th>
                                        <th>Status</th>
                                        <th>Follow-up</th>
                                        <th>Added</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.leads.map((l) => (
                                        <tr key={l.id} className="hover:bg-slate-50/60">
                                            <td>
                                                <p className="font-semibold text-slate-800">{l.name}</p>
                                                {l.notes && <p className="max-w-[12rem] truncate text-xs text-slate-400" title={l.notes}>{l.notes}</p>}
                                            </td>
                                            <td>
                                                <p className="text-slate-700">{l.phone}</p>
                                                {l.city && <p className="text-xs text-slate-400">{l.city}</p>}
                                            </td>
                                            <td className="max-w-[14rem] whitespace-normal text-slate-600">{detail(l) || '-'}</td>
                                            <td>
                                                <StatusSelect lead={l} />
                                            </td>
                                            <td>
                                                <FollowUp lead={l} />
                                            </td>
                                            <td className="text-xs text-slate-500">
                                                {formatDate(l.created_at, { year: undefined })}
                                                {l.source && <p className="text-slate-400">{l.source}</p>}
                                            </td>
                                            <td>
                                                <Actions lead={l} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {data.leads.map((l) => (
                            <div key={l.id} className="card p-4">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">{l.name}</p>
                                    <p className="text-sm text-slate-500">{l.phone}</p>
                                </div>
                                {(detail(l) || l.city) && <p className="mt-2 text-sm text-slate-600">{[detail(l), l.city].filter(Boolean).join(' · ')}</p>}
                                {l.notes && <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{l.notes}</p>}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                                        <StatusSelect lead={l} />
                                        <FollowUp lead={l} />
                                        <span className="text-xs text-slate-400">{[l.source, formatDate(l.created_at, { year: undefined })].filter(Boolean).join(' · ')}</span>
                                    </div>
                                    <Actions lead={l} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <LeadForm tab={tab} lead={editing?.id ? editing : null} open={!!editing} onClose={() => setEditing(null)} onSaved={() => reload(true)} />
            <ConfirmDialog
                open={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={remove}
                loading={deleting}
                title="Delete lead?"
                message={toDelete ? `${toDelete.name} (${toDelete.phone}) will be removed permanently.` : ''}
            />
        </>
    );
}

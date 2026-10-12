import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { formatMinutes, formatMoney, lastMonthRange, monthStartISO, todayISO } from '../lib/format';
import { Field, PageHeader, useToast } from '../components/ui';

export default function InvoiceCreate() {
    const navigate = useNavigate();
    const toast = useToast();
    const [params] = useSearchParams();
    const [clients, setClients] = useState([]);
    const [form, setForm] = useState({
        client_id: params.get('client_id') || '',
        from: params.get('from') || monthStartISO(),
        to: params.get('to') || todayISO(),
        issue_date: todayISO(),
        due_date: '',
        discount: '',
        notes: '',
    });
    const [extras, setExtras] = useState([]);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/admin/clients').then((r) => setClients(r.data));
    }, []);

    useEffect(() => {
        if (!form.client_id || !form.from || !form.to) return setPreview(null);
        setLoading(true);
        const t = setTimeout(() => {
            api.get('/admin/invoices/preview', { params: { client_id: form.client_id, from: form.from, to: form.to } })
                .then((r) => setPreview(r.data))
                .catch(() => setPreview(null))
                .finally(() => setLoading(false));
        }, 250);
        return () => clearTimeout(t);
    }, [form.client_id, form.from, form.to]);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const extrasTotal = extras.reduce((s, x) => s + Number(x.amount || 0), 0);
    const subtotal = (preview?.subtotal || 0) + extrasTotal;
    const discount = Number(form.discount || 0);
    const total = Math.max(0, subtotal - discount);
    const canSave = form.client_id && (preview?.sessions > 0 || extras.some((x) => x.description && x.amount));

    const submit = async () => {
        setSaving(true);
        try {
            const res = await api.post('/admin/invoices', {
                ...form,
                due_date: form.due_date || null,
                discount: discount || 0,
                extra_items: extras.filter((x) => x.description && x.amount !== ''),
            });
            toast('Bill created');
            navigate(`/admin/billing/${res.data.id}`, { replace: true });
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setSaving(false);
        }
    };

    const quick = [
        ['This month', [monthStartISO(), todayISO()]],
        ['Last month', lastMonthRange()],
    ];

    return (
        <div className="mx-auto max-w-3xl">
            <Link to="/admin/billing" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft size={16} /> Client bills
            </Link>
            <PageHeader title="Create bill" subtitle="Bill is made from completed duty hours that are not billed yet" />

            <div className="space-y-4">
                <div className="card space-y-4 p-5">
                    <Field label="Client *">
                        <select className="input" value={form.client_id} onChange={set('client_id')}>
                            <option value="">Select client</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.city ? `(${c.city})` : ''}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                            {quick.map(([label, [f, t]]) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => setForm({ ...form, from: f, to: t })}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        form.from === f && form.to === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Service from">
                                <input type="date" className="input" value={form.from} onChange={set('from')} />
                            </Field>
                            <Field label="Service to">
                                <input type="date" className="input" value={form.to} onChange={set('to')} />
                            </Field>
                        </div>
                    </div>
                </div>

                {form.client_id && (
                    <div className="card overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-4">
                            <h2 className="font-bold text-slate-900">Bill items</h2>
                            {preview && (
                                <p className="text-xs text-slate-400">
                                    {preview.sessions} shifts · {formatMinutes(preview.minutes)} of care
                                </p>
                            )}
                        </div>

                        {preview?.missing_rate > 0 && (
                            <div className="flex gap-2 bg-amber-50 px-5 py-3 text-sm text-amber-800">
                                <AlertTriangle size={18} className="shrink-0" />
                                <span>
                                    {preview.missing_rate} shifts have no client charge, so they show ₹0. Set the per-shift charge in the{' '}
                                    <Link to="/admin/assignments" className="font-semibold underline">
                                        assignment
                                    </Link>{' '}
                                    first, or edit the amount in Attendance.
                                </span>
                            </div>
                        )}

                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th className="text-right">Shifts</th>
                                        <th className="text-right">Rate / shift</th>
                                        <th className="text-right">Amount</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && !preview ? (
                                        <tr>
                                            <td colSpan={5} className="text-center">
                                                <Loader2 className="mx-auto animate-spin text-brand-600" />
                                            </td>
                                        </tr>
                                    ) : preview?.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center text-sm text-amber-700">
                                                No unbilled duties in this period
                                            </td>
                                        </tr>
                                    ) : (
                                        preview?.items.map((it, i) => (
                                            <tr key={i}>
                                                <td className="whitespace-normal font-medium text-slate-800">{it.description}</td>
                                                <td className="text-right">{it.quantity}</td>
                                                <td className="text-right">{formatMoney(it.rate)}</td>
                                                <td className="text-right font-semibold">{formatMoney(it.amount, { decimals: true })}</td>
                                                <td></td>
                                            </tr>
                                        ))
                                    )}
                                    {extras.map((x, i) => (
                                        <tr key={`x${i}`}>
                                            <td colSpan={3}>
                                                <input
                                                    className="input py-2"
                                                    value={x.description}
                                                    onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, description: e.target.value } : y)))}
                                                    placeholder="e.g. Medical supplies, Travel charge"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input w-28 py-2 text-right"
                                                    value={x.amount}
                                                    onChange={(e) => setExtras(extras.map((y, j) => (j === i ? { ...y, amount: e.target.value } : y)))}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td>
                                                <button className="p-1 text-rose-500" onClick={() => setExtras(extras.filter((_, j) => j !== i))}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="border-t border-slate-100 px-5 py-3">
                            <button className="btn-ghost px-2 py-1.5 text-brand-700" onClick={() => setExtras([...extras, { description: '', amount: '' }])}>
                                <Plus size={16} /> Add extra charge
                            </button>
                        </div>
                    </div>
                )}

                {form.client_id && (
                    <div className="card grid gap-4 p-5 sm:grid-cols-2">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Bill date">
                                    <input type="date" className="input" value={form.issue_date} onChange={set('issue_date')} />
                                </Field>
                                <Field label="Due date">
                                    <input type="date" className="input" value={form.due_date} onChange={set('due_date')} />
                                </Field>
                            </div>
                            <Field label="Discount (₹)">
                                <input type="number" min="0" step="0.01" className="input" value={form.discount} onChange={set('discount')} placeholder="0" />
                            </Field>
                            <Field label="Note on bill">
                                <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional" />
                            </Field>
                        </div>
                        <div className="flex flex-col justify-end rounded-2xl bg-slate-50 p-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Subtotal</span>
                                    <span>{formatMoney(subtotal, { decimals: true })}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-rose-600">
                                        <span>Discount</span>
                                        <span>- {formatMoney(discount, { decimals: true })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-extrabold text-slate-900">
                                    <span>Total</span>
                                    <span>{formatMoney(total, { decimals: true })}</span>
                                </div>
                            </div>
                            <button className="btn-primary mt-4 w-full py-3" onClick={submit} disabled={!canSave || saving}>
                                {saving && <Loader2 size={16} className="animate-spin" />} Create bill
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

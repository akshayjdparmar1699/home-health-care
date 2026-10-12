import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Printer, RotateCcw, Share2, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import { formatDate, formatMinutes, formatMoney, formatTime } from '../lib/format';
import { ConfirmDialog, Field, Modal, Spinner, StatusBadge, useToast } from '../components/ui';
import { PAYMENT_METHODS } from './PayoutForm';
import { BrandLogo } from '../components/Brand';
import ShareSheet from '../components/ShareSheet';

export default function InvoiceView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { data, loading, reload } = useFetch(`/admin/invoices/${id}`);
    const [payOpen, setPayOpen] = useState(false);
    const [payForm, setPayForm] = useState({ payment_method: 'UPI', reference: '' });
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    if (!data) return <Spinner />;
    const { invoice: inv, business: biz, cost, share_url: shareUrl } = data;
    const c = inv.client;

    const updateStatus = async (status, extra = {}) => {
        setBusy(true);
        try {
            await api.put(`/admin/invoices/${inv.id}`, { status, ...extra });
            toast(status === 'paid' ? 'Bill marked as paid' : 'Bill marked as unpaid');
            setPayOpen(false);
            reload(true);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await api.delete(`/admin/invoices/${inv.id}`);
            toast('Bill deleted. Duties can be billed again.');
            navigate('/admin/billing', { replace: true });
        } catch (e) {
            toast(errorMessage(e), 'error');
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
                <Link to="/admin/billing" className="mr-auto inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                    <ArrowLeft size={16} /> Client bills
                </Link>
                <button className="btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> Print / PDF
                </button>
                <button className="btn-secondary text-[#128c4b]" onClick={() => setShareOpen(true)}>
                    <Share2 size={16} /> Share
                </button>
                {inv.status === 'unpaid' ? (
                    <button className="btn-primary" onClick={() => setPayOpen(true)}>
                        <CheckCircle2 size={16} /> Mark paid
                    </button>
                ) : (
                    <button className="btn-secondary" onClick={() => updateStatus('unpaid')} disabled={busy}>
                        <RotateCcw size={16} /> Mark unpaid
                    </button>
                )}
                <button className="btn-secondary text-rose-600" onClick={() => setConfirm(true)}>
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Admin-only profit strip */}
            <div className="mb-4 grid grid-cols-3 gap-3 print:hidden">
                <div className="card p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-400">BILL TOTAL</p>
                    <p className="font-extrabold text-slate-900">{formatMoney(inv.total)}</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-400">STAFF COST</p>
                    <p className="font-extrabold text-slate-900">{formatMoney(cost)}</p>
                </div>
                <div className="card p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-400">YOUR PROFIT</p>
                    <p className={`font-extrabold ${inv.total - cost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(inv.total - cost)}</p>
                </div>
            </div>

            {/* Printable bill */}
            <div className="card p-6 sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
                <div className="flex flex-col justify-between gap-6 sm:flex-row">
                    <div>
                        <BrandLogo className="mb-3 h-14 w-auto" />
                        <h2 className="text-lg font-extrabold text-brand-700">{biz.business_name}</h2>
                        {biz.business_address && <p className="mt-1 max-w-xs whitespace-pre-line text-sm text-slate-500">{biz.business_address}</p>}
                        <p className="mt-1 text-sm text-slate-500">{[biz.business_phone, biz.business_email].filter(Boolean).join(' · ')}</p>
                        {biz.gstin && <p className="text-sm text-slate-500">GSTIN: {biz.gstin}</p>}
                    </div>
                    <div className="sm:text-right">
                        <p className="text-3xl font-extrabold tracking-tight text-slate-900">BILL</p>
                        <p className="mt-1 font-semibold text-slate-700">{inv.invoice_no}</p>
                        <p className="text-sm text-slate-500">Date: {formatDate(inv.issue_date)}</p>
                        {inv.due_date && <p className="text-sm text-slate-500">Due: {formatDate(inv.due_date)}</p>}
                        <div className="mt-2">
                            <StatusBadge status={inv.status === 'paid' ? 'active' : 'cancelled'} label={inv.status === 'paid' ? 'PAID' : 'UNPAID'} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 print:bg-transparent print:p-0">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bill to</p>
                        <p className="mt-1 font-bold text-slate-900">{c.name}</p>
                        <p className="text-sm text-slate-600">{[c.address, c.city, c.pincode].filter(Boolean).join(', ')}</p>
                        <p className="text-sm text-slate-600">{c.phone}</p>
                    </div>
                    <div className="sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Service period</p>
                        <p className="mt-1 font-semibold text-slate-800">
                            {formatDate(inv.period_from)} - {formatDate(inv.period_to)}
                        </p>
                        <p className="text-sm text-slate-600">{formatMinutes(inv.minutes)} of care</p>
                    </div>
                </div>

                <table className="mt-6 w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-2">Description</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Rate</th>
                            <th className="py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inv.items.map((it) => (
                            <tr key={it.id} className="border-b border-slate-100">
                                <td className="py-3 pr-2 font-medium text-slate-800">{it.description}</td>
                                <td className="py-3 text-right text-slate-600">{it.quantity ? `${it.quantity} ${it.unit || ''}` : it.minutes ? `${(it.minutes / 60).toFixed(2)} hrs` : '-'}</td>
                                <td className="py-3 text-right text-slate-600">{it.rate ? formatMoney(it.rate) : '-'}</td>
                                <td className="py-3 text-right font-semibold text-slate-900">{formatMoney(it.amount, { decimals: true })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-4 flex justify-end">
                    <div className="w-full max-w-xs space-y-2 text-sm">
                        <div className="flex justify-between text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatMoney(inv.subtotal, { decimals: true })}</span>
                        </div>
                        {inv.discount > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>Discount</span>
                                <span>- {formatMoney(inv.discount, { decimals: true })}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t-2 border-slate-200 pt-2 text-lg font-extrabold text-slate-900">
                            <span>Total</span>
                            <span>{formatMoney(inv.total, { decimals: true })}</span>
                        </div>
                        {inv.status === 'paid' && (
                            <p className="text-right text-xs text-emerald-700">
                                Paid on {formatDate(inv.paid_at)} {inv.payment_method && `via ${inv.payment_method}`} {inv.reference && `(${inv.reference})`}
                            </p>
                        )}
                    </div>
                </div>

                {(inv.notes || biz.bank_details || biz.invoice_terms) && (
                    <div className="mt-8 grid gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-2">
                        {biz.bank_details && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment details</p>
                                <p className="mt-1 whitespace-pre-line text-slate-600">{biz.bank_details}</p>
                            </div>
                        )}
                        {(inv.notes || biz.invoice_terms) && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</p>
                                {inv.notes && <p className="mt-1 whitespace-pre-line text-slate-600">{inv.notes}</p>}
                                {biz.invoice_terms && <p className="mt-1 whitespace-pre-line text-slate-500">{biz.invoice_terms}</p>}
                            </div>
                        )}
                    </div>
                )}

                {inv.attendances.length > 0 && (
                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Visit details</p>
                        <table className="w-full text-xs">
                            <tbody>
                                {inv.attendances.map((a) => (
                                    <tr key={a.id} className="border-b border-slate-50">
                                        <td className="py-1.5 text-slate-600">{formatDate(a.duty_date)}</td>
                                        <td className="py-1.5 text-slate-600">{a.staff?.name}</td>
                                        <td className="py-1.5 text-slate-600">
                                            {formatTime(a.clock_in)} - {formatTime(a.clock_out)}
                                        </td>
                                        <td className="py-1.5 text-right font-medium text-slate-800">{formatMinutes(a.worked_minutes)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="mt-10 text-center text-xs text-slate-400">Thank you for trusting {biz.business_name} with your care.</p>
            </div>

            <Modal
                open={payOpen}
                onClose={() => setPayOpen(false)}
                size="sm"
                title="Mark bill as paid"
                subtitle={`${c.name} · ${formatMoney(inv.total)}`}
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setPayOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={() => updateStatus('paid', payForm)} disabled={busy}>
                            {busy && <Loader2 size={16} className="animate-spin" />} Confirm paid
                        </button>
                    </>
                }
            >
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Method">
                        <select className="input" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                            {PAYMENT_METHODS.map((m) => (
                                <option key={m}>{m}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Reference / UTR">
                        <input className="input" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
                    </Field>
                </div>
            </Modal>

            <ShareSheet
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                title={`Bill ${inv.invoice_no}`}
                subtitle={`${inv.client?.name || ''} · ${formatMoney(inv.total)}`}
                text={`Hello ${inv.client?.name || ''}, your bill ${inv.invoice_no} from ${biz.business_name} for ${formatDate(inv.period_from, { year: undefined })} - ${formatDate(inv.period_to)} is ${formatMoney(inv.total)}${inv.status === 'paid' ? ' (paid, thank you!)' : ''}. View & download:`}
                url={shareUrl}
                phone={inv.client?.phone}
                phoneLabel={inv.client?.name ? `to ${inv.client.name.split(' ')[0]}` : undefined}
            />

            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={remove}
                loading={busy}
                title="Delete this bill?"
                message="The duties in this bill will become unbilled again and can be added to a new bill."
            />
        </div>
    );
}

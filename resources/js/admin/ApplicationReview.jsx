import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Pencil, Phone, Trash2, XCircle } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import useFetch from '../lib/useFetch';
import RoleSelect from '../components/RoleSelect';
import { formatDate, todayISO } from '../lib/format';
import { ConfirmDialog, Field, Modal, Spinner, StatusBadge, useToast } from '../components/ui';
import StaffProfileView from './StaffProfileView';

export default function ApplicationReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const { data: s, loading } = useFetch(`/admin/staff/${id}`);
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [approveForm, setApproveForm] = useState(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);

    if (!s) return <Spinner />;

    const act = async (fn, msg, to) => {
        setBusy(true);
        try {
            await fn();
            toast(msg);
            navigate(to, { replace: true });
        } catch (e) {
            toast(errorMessage(e), 'error');
            setBusy(false);
        }
    };

    const openApprove = () => {
        setApproveForm({ designation: s.designation || '', joining_date: todayISO() });
        setApproveOpen(true);
    };

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <Link to="/admin/applications" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft size={16} /> Applications
            </Link>

            <div className="card p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-slate-900">{s.name}</h1>
                            <StatusBadge
                                status={s.status === 'pending' ? 'on_break' : s.status === 'rejected' ? 'cancelled' : 'active'}
                                label={s.status === 'pending' ? 'Waiting for approval' : s.status === 'rejected' ? 'Rejected' : 'Approved'}
                            />
                        </div>
                        <p className="font-medium text-brand-700">
                            {s.designation || 'Role not set yet'} {s.city && `· ${s.city}`} {s.pincode && `- ${s.pincode}`}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 hover:text-brand-700">
                                <Phone size={13} /> {s.phone}
                            </a>{' '}
                            · Applied {formatDate(s.created_at)}
                        </p>
                        {s.status === 'rejected' && s.rejection_reason && (
                            <p className="mt-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">Rejection reason: {s.rejection_reason}</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link to={`/admin/staff/${s.id}/edit`} className="btn-secondary">
                            <Pencil size={16} /> Edit
                        </Link>
                        {s.status === 'pending' && (
                            <button className="btn-secondary text-rose-600" onClick={() => setRejectOpen(true)}>
                                <XCircle size={16} /> Reject
                            </button>
                        )}
                        {s.status === 'rejected' && (
                            <button className="btn-secondary text-rose-600" onClick={() => setDeleteOpen(true)}>
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                        <button className="btn-primary" onClick={openApprove}>
                            <CheckCircle2 size={16} /> Approve
                        </button>
                    </div>
                </div>
            </div>

            <StaffProfileView staff={s} />

            <Modal
                open={approveOpen}
                onClose={() => setApproveOpen(false)}
                size="sm"
                title={`Approve ${s.name}?`}
                subtitle="They can log in right away with their mobile number and password"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setApproveOpen(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            disabled={busy}
                            onClick={() => act(() => api.post(`/admin/staff/${s.id}/approve`, approveForm), `${s.name} approved`, `/admin/staff/${s.id}`)}
                        >
                            {busy && <Loader2 size={16} className="animate-spin" />} Approve
                        </button>
                    </>
                }
            >
                {approveForm && (
                    <div className="space-y-4">
                        <Field label="Role / designation (optional)" hint="Can be set later from Edit">
                            <RoleSelect value={approveForm.designation} onChange={(v) => setApproveForm({ ...approveForm, designation: v })} />
                        </Field>
                        <Field label="Joining date">
                            <input type="date" className="input" value={approveForm.joining_date} onChange={(e) => setApproveForm({ ...approveForm, joining_date: e.target.value })} />
                        </Field>
                    </div>
                )}
            </Modal>

            <Modal
                open={rejectOpen}
                onClose={() => setRejectOpen(false)}
                size="sm"
                title="Reject application?"
                subtitle="The staff will see this reason when they try to log in"
                footer={
                    <>
                        <button className="btn-secondary" onClick={() => setRejectOpen(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn-danger"
                            disabled={busy}
                            onClick={() => act(() => api.post(`/admin/staff/${s.id}/reject`, { reason: reason || null }), 'Application rejected', '/admin/applications')}
                        >
                            {busy && <Loader2 size={16} className="animate-spin" />} Reject
                        </button>
                    </>
                }
            >
                <Field label="Reason (optional)">
                    <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Aadhaar photo is not clear, please register again" />
                </Field>
            </Modal>

            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                loading={busy}
                onConfirm={() => act(() => api.delete(`/admin/staff/${s.id}`), 'Application deleted', '/admin/applications')}
                title="Delete application?"
                message="The application and uploaded documents will be permanently deleted. The person can register again with the same mobile number."
            />
        </div>
    );
}

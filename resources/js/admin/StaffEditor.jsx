import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { emptyStaffForm, mapErrors, staffFormData, staffToForm } from '../lib/staffForm';
import StaffProfileFields, { SectionTitle } from '../components/StaffProfileFields';
import { PageHeader, Spinner, useToast } from '../components/ui';

const SECTIONS = [
    ['account', 'Account & role'],
    ['personal', 'Personal information'],
    ['address', 'Address & emergency contact'],
    ['education', 'Educational qualification'],
    ['experience', 'Experience details'],
    ['bank', 'Bank details'],
    ['documents', 'Selfie & Aadhaar card'],
    ['medical', 'Medical declaration'],
];

/** Full staff form for admins: add a new staff member or edit any staff / applicant. */
export default function StaffEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [staff, setStaff] = useState(null);
    const [form, setForm] = useState(emptyStaffForm);
    const [files, setFiles] = useState({ selfie: null, aadhaar_front: null, aadhaar_back: null });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        api.get(`/admin/staff/${id}`)
            .then((r) => {
                setStaff(r.data);
                setForm(staffToForm(r.data));
            })
            .catch((e) => toast(errorMessage(e), 'error'))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    if (loading) return <Spinner />;

    const back = staff ? (staff.status === 'approved' ? `/admin/staff/${staff.id}` : `/admin/applications/${staff.id}`) : '/admin/staff';

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        try {
            const fd = staffFormData({ ...form, password_confirmation: '', terms: false }, files, staff ? { _method: 'PUT' } : {});
            const res = await api.post(staff ? `/admin/staff/${staff.id}` : '/admin/staff', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast(staff ? 'Staff details saved' : 'Staff added successfully');
            navigate(staff ? back : `/admin/staff/${res.data.id}`, { replace: true });
        } catch (err) {
            if (err.response?.status === 422) {
                const mapped = mapErrors(err);
                setErrors(mapped);
                toast(Object.values(mapped)[0], 'error');
                setTimeout(() => document.querySelector('.text-rose-600')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
            } else toast(errorMessage(err), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="mx-auto max-w-3xl">
            <Link to={back} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
                <ArrowLeft size={16} /> Back
            </Link>
            <PageHeader
                title={staff ? `Edit ${staff.name}` : 'Add new staff'}
                subtitle={staff ? 'Update any details or documents' : 'Fill in the same details as the staff registration form. Only name and mobile are required.'}
            />

            <div className="space-y-4">
                {SECTIONS.map(([key, title], i) => (
                    <div key={key} className="card p-5 sm:p-6">
                        <SectionTitle number={i + 1} title={title} />
                        <StaffProfileFields section={key} form={form} setForm={setForm} files={files} setFiles={setFiles} errors={errors} mode="admin" staff={staff} />
                    </div>
                ))}
            </div>

            <div className="sticky bottom-20 z-10 mt-5 flex justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
                <Link to={back} className="btn-secondary">
                    Cancel
                </Link>
                <button className="btn-primary" disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {staff ? 'Save changes' : 'Add staff'}
                </button>
            </div>
        </form>
    );
}

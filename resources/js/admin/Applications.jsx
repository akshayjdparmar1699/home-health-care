import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Copy, Inbox, MapPin, Phone, Share2 } from 'lucide-react';
import useFetch from '../lib/useFetch';
import { formatDate } from '../lib/format';
import AuthImage from '../components/AuthImage';
import { Avatar, EmptyState, PageHeader, Spinner, useToast } from '../components/ui';

export default function Applications() {
    const toast = useToast();
    const [status, setStatus] = useState('pending');
    const { data, loading } = useFetch('/admin/applications', { status });
    const link = `${window.location.origin}/register`;

    const share = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Staff registration', text: 'Register as staff with us:', url: link });
            } catch {
                // cancelled
            }
            return;
        }
        try {
            await navigator.clipboard.writeText(link);
            toast('Registration link copied');
        } catch {
            toast(link);
        }
    };

    return (
        <>
            <PageHeader title="Staff Applications" subtitle="Staff who registered themselves using the link" />

            <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">Registration link for new staff</p>
                    <p className="truncate font-mono text-sm text-brand-700">{link}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="btn-secondary"
                        onClick={() =>
                            navigator.clipboard
                                ?.writeText(link)
                                .then(() => toast('Link copied'))
                                .catch(() => toast(link))
                        }
                    >
                        <Copy size={16} /> Copy
                    </button>
                    <button className="btn-primary" onClick={share}>
                        <Share2 size={16} /> Share
                    </button>
                </div>
            </div>

            <div className="mb-4 flex w-fit rounded-xl bg-slate-100 p-1">
                {[
                    ['pending', 'Waiting for approval'],
                    ['rejected', 'Rejected'],
                ].map(([v, l]) => (
                    <button
                        key={v}
                        onClick={() => setStatus(v)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${status === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                        {l}
                    </button>
                ))}
            </div>

            {!data ? (
                <Spinner />
            ) : data.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={Inbox}
                        title={status === 'pending' ? 'No new applications' : 'No rejected applications'}
                        text={status === 'pending' ? 'Share the registration link with new staff. Their applications will appear here.' : undefined}
                    />
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {data.map((a) => (
                        <Link key={a.id} to={`/admin/applications/${a.id}`} className="card group flex items-center gap-4 p-4 transition hover:border-brand-200 hover:shadow-md">
                            {a.profile?.documents?.selfie ? (
                                <AuthImage src={`/admin/staff/${a.id}/documents/selfie`} alt={a.name} className="h-16 w-16 shrink-0 rounded-2xl" />
                            ) : (
                                <Avatar name={a.name} size="lg" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-slate-900">{a.name}</p>
                                <p className="truncate text-sm font-medium text-brand-700">{a.designation || 'New applicant'}</p>
                                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Phone size={11} /> {a.phone}
                                    </span>
                                    {a.city && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={11} /> {a.city}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-slate-400">Applied {formatDate(a.created_at)}</p>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}

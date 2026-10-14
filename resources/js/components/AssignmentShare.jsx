import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Share2, UserRound, Users } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import { clientMessage, staffMessage } from '../lib/assignmentMessages';
import ShareSheet from './ShareSheet';
import { Modal } from './ui';

let businessCache = null;

const waNumber = (phone) => {
    const d = String(phone || '').replace(/\D/g, '');
    return d.length === 10 ? `91${d}` : d;
};

function WhatsAppIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.3l5.72-1.5a11.33 11.33 0 0 0 5.72 1.46c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
        </svg>
    );
}

function Recipient({ icon: Icon, who, name, phone, message, onMore }) {
    const [showText, setShowText] = useState(false);
    const wa = waNumber(phone);

    return (
        <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon size={19} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{who}</p>
                    <p className="truncate font-bold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{phone || 'No mobile number saved'}</p>
                </div>
            </div>

            <button onClick={() => setShowText(!showText)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600">
                {showText ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showText ? 'Hide message' : 'See message'}
            </button>
            {showText && <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{message}</p>}

            <div className="mt-3 flex gap-2">
                {wa ? (
                    <a
                        href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn flex-1 bg-[#25d366] py-2.5 text-white hover:bg-[#1ebe5b]"
                    >
                        <WhatsAppIcon /> WhatsApp {name?.split(' ')[0]}
                    </a>
                ) : (
                    <p className="flex-1 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">Add a mobile number to send on WhatsApp.</p>
                )}
                <button onClick={onMore} className="btn-secondary px-3" title="Other apps / copy">
                    <Share2 size={16} />
                </button>
            </div>
        </div>
    );
}

/**
 * Share a new / existing assignment on WhatsApp: the staff member gets the client's details and
 * directions, the client gets the caregiver's details. Money is never sent to the wrong side.
 */
export default function AssignmentShare({ assignment: a, open, onClose, title = 'Share assignment on WhatsApp' }) {
    const { user } = useAuth();
    const [business, setBusiness] = useState(businessCache || {});
    const [more, setMore] = useState(null);

    useEffect(() => {
        if (!open || businessCache) return;
        api.get('/admin/settings')
            .then((r) => {
                businessCache = r.data;
                setBusiness(r.data);
            })
            .catch(() => {});
    }, [open]);

    if (!a) return null;
    const appUrl = `${window.location.origin}/staff`;
    const toStaff = staffMessage(a, business, appUrl);
    const toClient = clientMessage(a, business, user?.phone);
    const staffPhone = a.staff?.profile?.whatsapp || a.staff?.phone;

    return (
        <>
            <Modal open={open && !more} onClose={onClose} title={title} subtitle={`${a.staff?.name} → ${a.client?.name}`}>
                <div className="space-y-3">
                    <Recipient
                        icon={Users}
                        who="Tell the staff"
                        name={a.staff?.name}
                        phone={staffPhone}
                        message={toStaff}
                        onMore={() => setMore({ text: toStaff, phone: staffPhone, name: a.staff?.name })}
                    />
                    <Recipient
                        icon={UserRound}
                        who="Tell the client"
                        name={a.client?.name}
                        phone={a.client?.relative_phone}
                        message={toClient}
                        onMore={() => setMore({ text: toClient, phone: a.client?.relative_phone, name: a.client?.relative_name || a.client?.name })}
                    />
                    <p className="text-center text-[11px] text-slate-400">The staff message has their pay. The client message has no prices and no staff phone number.</p>
                </div>
            </Modal>
            <ShareSheet
                open={!!more}
                onClose={() => setMore(null)}
                title={`Message for ${more?.name || ''}`}
                text={more?.text || ''}
                phone={more?.phone}
                phoneLabel={more?.name ? `to ${more.name.split(' ')[0]}` : undefined}
            />
        </>
    );
}

import { useState } from 'react';
import { Check, Copy, ExternalLink, Mail, MessageSquare, Share2 } from 'lucide-react';
import { Modal, useToast } from './ui';

/** 10-digit Indian mobile -> 91XXXXXXXXXX for wa.me links. */
function waNumber(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) return `91${d}`;
    return d.length >= 11 ? d : '';
}

function WhatsAppIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.3l5.72-1.5a11.33 11.33 0 0 0 5.72 1.46h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
        </svg>
    );
}

/**
 * Share a bill / payment slip link: native share sheet (WhatsApp, Telegram, Gmail, ...),
 * direct WhatsApp to the given number, SMS, email, copy link, open (for PDF download).
 */
export default function ShareSheet({ open, onClose, title, subtitle, text, url, phone, phoneLabel }) {
    const toast = useToast();
    const [copied, setCopied] = useState(false);
    if (!open) return null;

    const message = url ? `${text}\n${url}` : text;
    const enc = encodeURIComponent(message);
    const wa = waNumber(phone);
    const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

    const nativeShare = async () => {
        try {
            await navigator.share(url ? { title, text, url } : { title, text });
        } catch {
            // closed by the user
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = message;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopied(true);
        toast(url ? 'Link copied. Paste it in any app.' : 'Message copied. Paste it in any app.');
        setTimeout(() => setCopied(false), 2000);
    };

    const Item = ({ href, onClick, icon, label, sub, tone }) => {
        const cls = `flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-semibold transition hover:brightness-95 ${tone}`;
        return href ? (
            <a href={href} target="_blank" rel="noreferrer" className={cls}>
                {icon}
                <span>{label}</span>
                {sub && <span className="-mt-1.5 text-[10px] font-medium opacity-70">{sub}</span>}
            </a>
        ) : (
            <button type="button" onClick={onClick} className={cls}>
                {icon}
                <span>{label}</span>
                {sub && <span className="-mt-1.5 text-[10px] font-medium opacity-70">{sub}</span>}
            </button>
        );
    };

    return (
        <Modal open={open} onClose={onClose} size="sm" title={title} subtitle={subtitle}>
            <div className="space-y-4">
                {canNativeShare && (
                    <button onClick={nativeShare} className="btn-primary w-full py-3 text-base">
                        <Share2 size={18} /> Share (WhatsApp, Gmail, Telegram...)
                    </button>
                )}

                <div className="grid grid-cols-3 gap-2">
                    {wa && (
                        <Item
                            href={`https://wa.me/${wa}?text=${enc}`}
                            icon={<WhatsAppIcon size={24} />}
                            label="WhatsApp"
                            sub={phoneLabel || 'to their number'}
                            tone="bg-[#e7f8ee] text-[#128c4b]"
                        />
                    )}
                    <Item href={`https://wa.me/?text=${enc}`} icon={<WhatsAppIcon size={24} />} label="WhatsApp" sub="choose contact" tone="bg-[#e7f8ee] text-[#128c4b]" />
                    <Item
                        href={`sms:${phone ? String(phone).replace(/\D/g, '') : ''}?&body=${enc}`}
                        icon={<MessageSquare size={22} />}
                        label="SMS"
                        tone="bg-sky-50 text-sky-700"
                    />
                    <Item href={`mailto:?subject=${encodeURIComponent(title)}&body=${enc}`} icon={<Mail size={22} />} label="Email" tone="bg-violet-50 text-violet-700" />
                    <Item onClick={copy} icon={copied ? <Check size={22} /> : <Copy size={22} />} label={copied ? 'Copied' : url ? 'Copy link' : 'Copy message'} tone="bg-slate-100 text-slate-700" />
                    {url && <Item href={url} icon={<ExternalLink size={22} />} label="Open / PDF" tone="bg-accent-50 text-accent-700" />}
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Message</p>
                    <p className="mt-1 whitespace-pre-line break-words text-xs text-slate-600">{message}</p>
                </div>
                {url && <p className="text-center text-[11px] text-slate-400">Anyone with this link can view and download it. No login needed.</p>}
            </div>
        </Modal>
    );
}

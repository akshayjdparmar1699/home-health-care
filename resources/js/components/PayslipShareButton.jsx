import { useState } from 'react';
import { Loader2, ReceiptText } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { formatDate, formatMoney } from '../lib/format';
import ShareSheet from './ShareSheet';
import { useToast } from './ui';

/** "Slip" button: loads a payout's share link and opens the share sheet. `admin` uses the admin API. */
export default function PayslipShareButton({ payoutId, admin = false, staffName, className = 'btn-ghost px-2.5 py-1.5 text-xs', label = 'Slip' }) {
    const toast = useToast();
    const [slip, setSlip] = useState(null);
    const [loading, setLoading] = useState(false);

    const open = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(admin ? `/admin/payouts/${payoutId}` : `/staff/payouts/${payoutId}`);
            setSlip(data);
        } catch (e) {
            toast(errorMessage(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const name = staffName || slip?.staff?.name;
    const paidLine = slip?.status === 'paid' ? `paid${slip.paid_at ? ` on ${formatDate(slip.paid_at)}` : ''}${slip.payment_method ? ` via ${slip.payment_method}` : ''}` : 'is being processed';
    const text = slip
        ? `${name ? `Hello ${name}, ` : ''}payment slip ${slip.slip_no} from Yours Home Healthcare for ${formatDate(slip.period_from, { year: undefined })} - ${formatDate(slip.period_to)}: ${formatMoney(slip.amount)} ${paidLine}. View & download:`
        : '';

    return (
        <>
            <button type="button" onClick={open} className={className} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ReceiptText size={14} />} {label}
            </button>
            <ShareSheet
                open={!!slip}
                onClose={() => setSlip(null)}
                title={`Payment slip ${slip?.slip_no || ''}`}
                subtitle={slip ? `${name ? `${name} · ` : ''}${formatMoney(slip.amount)}` : ''}
                text={text}
                url={slip?.share_url}
                phone={admin ? slip?.whatsapp : null}
                phoneLabel={name ? `to ${name.split(' ')[0]}` : undefined}
            />
        </>
    );
}

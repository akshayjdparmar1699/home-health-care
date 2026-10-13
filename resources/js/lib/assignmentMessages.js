import { directionsLink, formatDate, formatMoney, formatShift, shiftLabel } from './format';

const firstName = (name) => (name || '').split(' ')[0];

function shiftLine(a) {
    const label = shiftLabel(a.shift_hours, a.shift_type);
    const time = a.shift_start ? formatShift(a.shift_start, a.shift_end).replace(' – ', ' to ') : '';
    return [label, time].filter(Boolean).join(', ');
}

/** WhatsApp message to the staff member about their new client. Never includes the client charge. */
export function staffMessage(a, business, appUrl) {
    const c = a.client || {};
    const address = [c.address, c.city, c.pincode].filter(Boolean).join(', ');
    return [
        `*${business.business_name || 'Yours Home Healthcare'}*`,
        `Hello ${firstName(a.staff?.name)}, you have been assigned a new client.`,
        '',
        `*Client:* ${c.name}${c.age ? ` (${c.age} yrs)` : ''}`,
        address && `*Address:* ${address}`,
        c.phone && `*Client mobile:* ${c.phone}`,
        a.shift_hours && `*Shift:* ${shiftLine(a)}`,
        `*Starting:* ${formatDate(a.start_date)}`,
        a.staff_rate ? `*Your pay:* ${formatMoney(a.staff_rate)} per shift` : null,
        a.notes && `*Instructions:* ${a.notes}`,
        '',
        (c.map_link || address) && `Directions: ${directionsLink(c)}`,
        `Start your duty with a selfie in the app: ${appUrl}`,
    ]
        .filter((line) => line !== null && line !== undefined && line !== false)
        .join('\n');
}

/**
 * WhatsApp message to the client / family about who is coming. No money and no staff phone number;
 * the client is given the admin's number to call instead.
 */
export function clientMessage(a, business, adminPhone) {
    const helpPhone = adminPhone || business.business_phone;
    const s = a.staff || {};
    return [
        `*${business.business_name || 'Yours Home Healthcare'}*`,
        `Hello ${a.client?.name}, your caregiver has been assigned.`,
        '',
        `*Caregiver:* ${s.name}${s.designation ? ` (${s.designation})` : ''}`,
        a.shift_hours && `*Shift:* ${shiftLine(a)}`,
        `*Starting:* ${formatDate(a.start_date)}`,
        '',
        helpPhone ? `For any help, please call us: ${helpPhone}` : 'For any help, please contact our office.',
        'Thank you for trusting us. Your happiness is our success.',
    ]
        .filter((line) => line !== null && line !== undefined && line !== false)
        .join('\n');
}

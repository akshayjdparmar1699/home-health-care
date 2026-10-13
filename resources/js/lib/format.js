export function formatMinutes(min) {
    const m = Math.max(0, Math.round(min || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h === 0) return `${r}m`;
    return r ? `${h}h ${r}m` : `${h}h`;
}

export function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
}

export function formatTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDate(value, opts = {}) {
    if (!value) return '-';
    const d = typeof value === 'string' && value.length === 10 ? new Date(value + 'T00:00:00') : new Date(value);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatShift(start, end) {
    if (!start) return 'Flexible';
    const t = (v) => {
        const [h, m] = v.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m);
        return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    };
    return end ? `${t(start)} – ${t(end)}` : t(start);
}

export function todayISO() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function toLocalInput(value) {
    if (!value) return '';
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('');
}

export function mapsLink(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Directions to a client: the exact map pin they shared, else a search for their address. */
export function directionsLink(client) {
    if (client?.map_link) return client.map_link;
    return mapsLink([client?.address, client?.city, client?.pincode].filter(Boolean).join(', '));
}

export function formatMoney(value, { decimals = false } = {}) {
    const n = Number(value || 0);
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: decimals ? 2 : 0 });
}

export function monthStartISO() {
    return todayISO().slice(0, 8) + '01';
}

export function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function lastMonthRange() {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const last = new Date(d.getFullYear(), d.getMonth(), 0);
    const iso = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    return [iso(first), iso(last)];
}

export function timeAgo(value) {
    const s = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr ago`;
    return formatDate(value, { year: undefined });
}

/** "12 hr Night shift" (or "12 hr Night" when short). */
export function shiftLabel(hours, type, { short = false } = {}) {
    if (!hours) return '';
    const kind = type ? ` ${type === 'night' ? 'Night' : 'Day'}` : '';
    return `${hours} hr${kind}${short ? '' : ' shift'}`;
}

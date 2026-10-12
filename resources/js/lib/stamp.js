/**
 * "GPS camera" style photo: the original picture untouched on top, and a details band
 * (title + lines + emblem) added BELOW it, so nothing covers the face. Returns a JPEG Blob.
 */
export async function stampImage(blob, { title, lines }) {
    const img = await loadImage(URL.createObjectURL(blob));
    const emblem = await loadImage('/brand/emblem-white.png').catch(() => null);

    const w = img.width;
    const base = Math.max(16, Math.round(w / 34));
    const pad = Math.round(base * 0.9);
    const lineH = Math.round(base * 1.4);
    const titleH = Math.round(base * 1.6);
    const accentH = Math.max(4, Math.round(base * 0.22));
    const bandH = accentH + pad * 2 + titleH + lines.length * lineH;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = img.height + bandH;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0);

    const top = img.height;
    const accent = ctx.createLinearGradient(0, 0, w, 0);
    accent.addColorStop(0, '#24366d');
    accent.addColorStop(1, '#d23b70');
    ctx.fillStyle = accent;
    ctx.fillRect(0, top, w, accentH);

    const band = ctx.createLinearGradient(0, top, w, canvas.height);
    band.addColorStop(0, '#1d2b57');
    band.addColorStop(1, '#3a2350');
    ctx.fillStyle = band;
    ctx.fillRect(0, top + accentH, w, bandH - accentH);

    let reserved = pad;
    if (emblem) {
        const eh = Math.min(bandH - accentH - pad * 2, Math.round(base * 3.6));
        const ew = Math.round((emblem.width / emblem.height) * eh);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(emblem, w - pad - ew, top + accentH + Math.round((bandH - accentH - eh) / 2), ew, eh);
        ctx.globalAlpha = 1;
        reserved = pad * 2 + ew;
    }
    const maxText = w - pad - reserved;

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(base * 1.2)}px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.fillText(fit(ctx, title, maxText), pad, top + accentH + pad);

    ctx.font = `500 ${base}px "Plus Jakarta Sans", system-ui, sans-serif`;
    lines.forEach((line, i) => {
        ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.82)';
        ctx.fillText(fit(ctx, line, maxText), pad, top + accentH + pad + titleH + i * lineH);
    });

    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create photo'))), 'image/jpeg', 0.86));
}

/** Shorten text with an ellipsis so it never runs under the emblem or off the edge. */
function fit(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

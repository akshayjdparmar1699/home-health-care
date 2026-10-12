/** Yours Home Healthcare logo. variant: 'full' (emblem + name) | 'emblem'. `white` for dark / gradient backgrounds. */
export function BrandLogo({ variant = 'full', white = false, className = '' }) {
    const src = `/brand/${variant === 'emblem' ? 'emblem' : 'logo'}${white ? '-white' : ''}.png`;
    return <img src={src} alt="Yours Home Healthcare" className={`select-none object-contain ${className}`} draggable="false" />;
}

/** Compact header brand: emblem + two-line name. */
export function BrandMark({ subtitle, className = '' }) {
    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <BrandLogo variant="emblem" className="h-9 w-9" />
            <div className="leading-tight">
                <p className="text-[15px] font-extrabold text-brand-700">
                    Yours Home <span className="text-accent-500">Healthcare</span>
                </p>
                {subtitle && <p className="text-[11px] font-medium text-slate-400">{subtitle}</p>}
            </div>
        </div>
    );
}

export const APP_NAME = 'Yours Home Healthcare';

import { useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';

/** Cards / Table choice for a list page, remembered per page in this browser. */
export function useSavedView(storageKey) {
    const [view, setView] = useState(() => {
        try {
            return localStorage.getItem(storageKey) === 'table' ? 'table' : 'cards';
        } catch {
            return 'cards';
        }
    });

    const change = (next) => {
        setView(next);
        try {
            localStorage.setItem(storageKey, next);
        } catch {
            // storage unavailable; view still changes for this visit
        }
    };

    return [view, change];
}

export default function ViewToggle({ view, onChange }) {
    return (
        <div className="flex shrink-0 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="View">
            {[
                ['cards', 'Cards', LayoutGrid],
                ['table', 'Table', Table2],
            ].map(([value, label, Icon]) => (
                <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => onChange(value)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        view === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );
}

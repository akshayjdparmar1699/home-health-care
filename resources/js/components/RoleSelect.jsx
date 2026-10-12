import { useState } from 'react';
import { DESIGNATIONS } from '../lib/staffForm';

const OTHER = '__other';

/** Role dropdown with an "Other..." choice that lets the admin type any role. */
export default function RoleSelect({ value, onChange }) {
    const [other, setOther] = useState(!!value && !DESIGNATIONS.includes(value));

    return (
        <>
            <select
                className="input"
                value={other ? OTHER : value || ''}
                onChange={(e) => {
                    const v = e.target.value;
                    setOther(v === OTHER);
                    onChange(v === OTHER ? '' : v);
                }}
            >
                <option value="">Select role</option>
                {DESIGNATIONS.map((d) => (
                    <option key={d}>{d}</option>
                ))}
                <option value={OTHER}>Other...</option>
            </select>
            {other && (
                <input
                    className="input mt-2"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type role, e.g. Cook, Driver, Lab Technician"
                    maxLength={80}
                    autoFocus
                />
            )}
        </>
    );
}

import { useState } from 'react';
import { CITY_NAMES, pincodeFor } from '../lib/gujaratCities';
import { Field } from './ui';

const OTHER = '__other';

/**
 * Gujarat city dropdown that fills the pincode automatically.
 * "Other city" lets the user type a city that is not in the list.
 */
export default function CityPincodeFields({ form, setForm, errors = {}, required = false, cityClass = '', pincodeClass = '' }) {
    const known = !form.city || CITY_NAMES.some((c) => c.toLowerCase() === form.city.toLowerCase());
    const [other, setOther] = useState(!known);

    const pickCity = (e) => {
        const v = e.target.value;
        if (v === OTHER) {
            setOther(true);
            setForm((f) => ({ ...f, city: '', pincode: '' }));
            return;
        }
        setOther(false);
        setForm((f) => ({ ...f, city: v, pincode: pincodeFor(v) || f.pincode }));
    };

    return (
        <>
            <Field label={`City${required ? ' *' : ''}`} error={errors.city} className={cityClass}>
                <select className="input" value={other ? OTHER : CITY_NAMES.find((c) => c.toLowerCase() === (form.city || '').toLowerCase()) || ''} onChange={pickCity}>
                    <option value="">Select city</option>
                    {CITY_NAMES.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                    <option value={OTHER}>Other city...</option>
                </select>
                {other && (
                    <input
                        className="input mt-2"
                        value={form.city || ''}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="Type city / village name"
                        autoFocus
                    />
                )}
            </Field>
            <Field label="Pincode" error={errors.pincode} className={pincodeClass} hint={!other && form.city ? 'Filled automatically, change if needed' : undefined}>
                <input
                    className="input tracking-wider"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pincode || ''}
                    onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    placeholder="6 digit pincode"
                />
            </Field>
        </>
    );
}

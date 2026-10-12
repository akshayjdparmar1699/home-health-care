import { useEffect, useState } from 'react';
import api from './api';

/** Cities already used by clients / staff, for filters and input suggestions. */
export default function useCities() {
    const [cities, setCities] = useState([]);
    useEffect(() => {
        api.get('/admin/cities').then((r) => setCities(r.data)).catch(() => {});
    }, []);
    return cities;
}

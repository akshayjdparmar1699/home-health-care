import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json' },
});

/**
 * Admin and staff keep separate logins in the same browser: /admin pages use the admin token,
 * /staff pages use the staff token, so opening one never switches you to the other.
 */
export const REALMS = ['admin', 'staff'];

export function realmFromPath(path = window.location.pathname) {
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/staff')) return 'staff';
    return null;
}

export const tokenKey = (realm) => `hc_token_${realm}`;
export const userKey = (realm) => `hc_user_${realm}`;

export function getToken(realm) {
    try {
        return realm ? localStorage.getItem(tokenKey(realm)) : null;
    } catch {
        return null;
    }
}

api.interceptors.request.use((config) => {
    if (!config.headers.Authorization) {
        const token = getToken(realmFromPath());
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (error) => {
        const realm = realmFromPath();
        if (error.response?.status === 401 && realm && !error.config.url.endsWith('/login')) {
            localStorage.removeItem(tokenKey(realm));
            localStorage.removeItem(userKey(realm));
            window.location.href = `/${realm}/login`;
        }
        return Promise.reject(error);
    },
);

/** First readable message from a Laravel error response. */
export function errorMessage(error) {
    const data = error?.response?.data;
    if (data?.errors) return Object.values(data.errors)[0]?.[0];
    return data?.message || error?.message || 'Something went wrong';
}

export default api;

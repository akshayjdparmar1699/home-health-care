import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { realmFromPath, REALMS, tokenKey, userKey } from './api';
import { disablePush } from './push';

const AuthContext = createContext(null);

function read(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
        return null;
    }
}

function write(realm, token, user) {
    try {
        if (token) {
            localStorage.setItem(tokenKey(realm), token);
            localStorage.setItem(userKey(realm), JSON.stringify(user));
        } else {
            localStorage.removeItem(tokenKey(realm));
            localStorage.removeItem(userKey(realm));
        }
    } catch {
        // storage unavailable
    }
}

/** One-time move of the old single login (hc_token) into its role's slot. */
function migrateOldLogin() {
    try {
        const token = localStorage.getItem('hc_token');
        const user = read('hc_user');
        if (token && user?.role && REALMS.includes(user.role) && !localStorage.getItem(tokenKey(user.role))) {
            write(user.role, token, user);
        }
        localStorage.removeItem('hc_token');
        localStorage.removeItem('hc_user');
    } catch {
        // ignore
    }
}

const hasToken = (realm) => {
    try {
        return !!localStorage.getItem(tokenKey(realm));
    } catch {
        return false;
    }
};

export function AuthProvider({ children }) {
    const location = useLocation();
    const [sessions, setSessions] = useState({ admin: null, staff: null });
    const [loading, setLoading] = useState(() => {
        migrateOldLogin();
        return REALMS.some(hasToken);
    });

    // Check every saved login with its own token.
    useEffect(() => {
        const checks = REALMS.filter(hasToken).map((realm) =>
            api
                .get('/me', { headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey(realm))}` } })
                .then((res) => {
                    write(realm, localStorage.getItem(tokenKey(realm)), res.data);
                    return [realm, res.data];
                })
                .catch((err) => {
                    // Only a real "not logged in" answer logs out. Offline / server down keeps the session.
                    if (err.response?.status === 401) {
                        write(realm, null);
                        return [realm, null];
                    }
                    return [realm, read(userKey(realm))];
                }),
        );
        if (!checks.length) return;
        Promise.all(checks).then((results) => {
            setSessions((s) => ({ ...s, ...Object.fromEntries(results) }));
            setLoading(false);
        });
    }, []);

    const realm = realmFromPath(location.pathname);
    const user = realm ? sessions[realm] : null;

    const login = async (loginId, password, portal) => {
        const res = await api.post('/login', { login: loginId, password, portal });
        const role = res.data.user.role;
        write(role, res.data.token, res.data.user);
        setSessions((s) => ({ ...s, [role]: res.data.user }));
        return res.data.user;
    };

    /** Log out of the section you are in (admin or staff); the other login stays. */
    const logout = async (which = realm) => {
        if (!which) return;
        const auth = { headers: { Authorization: `Bearer ${localStorage.getItem(tokenKey(which))}` } };
        try {
            await disablePush(); // this device stops getting this account's notifications
        } catch {
            // ignore
        }
        try {
            await api.post('/logout', {}, auth);
        } catch {
            // token may already be invalid
        }
        write(which, null);
        setSessions((s) => ({ ...s, [which]: null }));
    };

    return <AuthContext.Provider value={{ user, sessions, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

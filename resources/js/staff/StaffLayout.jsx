import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import InstallGuide from '../components/InstallGuide';
import { refreshPush } from '../lib/push';
import { History, Home, UserRound, Users, Wallet } from 'lucide-react';

const nav = [
    { to: '/staff', label: 'Duty', icon: Home, end: true },
    { to: '/staff/clients', label: 'Clients', icon: Users },
    { to: '/staff/history', label: 'Hours', icon: History },
    { to: '/staff/earnings', label: 'Earnings', icon: Wallet },
    { to: '/staff/profile', label: 'Profile', icon: UserRound },
];

export default function StaffLayout() {
    const location = useLocation();

    useEffect(() => {
        refreshPush();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <main className="mx-auto max-w-lg pb-28">
                <div key={location.pathname} className="page-in">
                    <Outlet />
                </div>
            </main>

            <InstallGuide auto />

            <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/95 backdrop-blur">
                <div className="mx-auto grid max-w-lg grid-cols-5">
                    {nav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand-700' : 'text-slate-400'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={`rounded-full px-4 py-1 transition ${isActive ? 'bg-brand-50' : ''}`}>
                                        <item.icon size={21} />
                                    </span>
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}

export function StaffPageHeader({ title, subtitle }) {
    return (
        <div className="safe-top-6 px-5 pb-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
    );
}

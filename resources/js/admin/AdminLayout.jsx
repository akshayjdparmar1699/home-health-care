import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    BarChart3,
    CalendarCheck,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    ReceiptText,
    Settings,
    UserCheck,
    UserRound,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { Avatar } from '../components/ui';
import { BrandLogo, BrandMark } from '../components/Brand';
import InstallGuide from '../components/InstallGuide';
import { refreshPush } from '../lib/push';
import NotificationBell from '../components/NotificationBell';

const groups = [
    {
        title: null,
        items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
    },
    {
        title: 'Manage',
        items: [
            { to: '/admin/staff', label: 'Staff', icon: Users },
            { to: '/admin/applications', label: 'Applications', icon: UserCheck, badge: true },
            { to: '/admin/clients', label: 'Clients', icon: UserRound },
            { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
            { to: '/admin/attendance', label: 'Attendance & Hours', icon: CalendarCheck },
        ],
    },
    {
        title: 'Money',
        items: [
            { to: '/admin/billing', label: 'Client Bills', icon: ReceiptText },
            { to: '/admin/payouts', label: 'Staff Payments', icon: Wallet },
            { to: '/admin/reports', label: 'Reports & Profit', icon: BarChart3 },
        ],
    },
];

const mobileNav = [
    { to: '/admin', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/admin/staff', label: 'Staff', icon: Users },
    { to: '/admin/clients', label: 'Clients', icon: UserRound },
    { to: '/admin/attendance', label: 'Hours', icon: CalendarCheck },
];

const moreItems = [
    { to: '/admin/applications', label: 'Applications', icon: UserCheck, badge: true },
    { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/admin/billing', label: 'Client Bills', icon: ReceiptText },
    { to: '/admin/payouts', label: 'Staff Payments', icon: Wallet },
    { to: '/admin/reports', label: 'Reports & Profit', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [moreOpen, setMoreOpen] = useState(false);

    const [pending, setPending] = useState(0);

    useEffect(() => {
        refreshPush();
    }, []);

    useEffect(() => {
        setMoreOpen(false);
    }, [location.pathname]);

    // Pending staff applications badge, refreshed on navigation.
    useEffect(() => {
        api.get('/admin/applications', { params: { status: 'pending' } })
            .then((r) => setPending(r.data.length))
            .catch(() => {});
    }, [location.pathname]);

    const doLogout = async () => {
        await logout();
        navigate('/admin/login', { replace: true });
    };

    const moreActive = moreItems.some((i) => location.pathname.startsWith(i.to));

    return (
        <div className="min-h-screen lg:pl-64 print:pl-0">
            {/* Sidebar (desktop) */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/70 bg-white lg:flex print:hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                    <BrandLogo className="h-12 w-auto" />
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin Panel</p>
                </div>
                <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                    {groups.map((g, i) => (
                        <div key={i} className="space-y-1">
                            {g.title && <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>}
                            {g.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                            isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`
                                    }
                                >
                                    <item.icon size={19} />
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge && pending > 0 && (
                                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">{pending}</span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
                <div className="border-t border-slate-100 p-3">
                    <NavLink
                        to="/admin/settings"
                        className={({ isActive }) => `flex items-center gap-3 rounded-xl p-2 transition ${isActive ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                    >
                        <Avatar name={user.name} size="sm" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
                            <p className="truncate text-xs text-slate-400">Settings</p>
                        </div>
                        <Settings size={16} className="text-slate-400" />
                    </NavLink>
                    <button
                        onClick={doLogout}
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <LogOut size={18} /> Log out
                    </button>
                </div>
            </aside>

            {/* Top bar (mobile) */}
            <header className="safe-top sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur lg:hidden print:hidden">
                <div className="flex h-14 items-center justify-between px-4">
                <BrandMark />
                <NavLink to="/admin/settings" className="ml-12">
                    <Avatar name={user.name} size="sm" />
                </NavLink>
                </div>
            </header>

            {/* Top bar (desktop): room for the notification bell */}
            <div className="sticky top-0 z-20 hidden h-14 border-b border-slate-200/60 bg-slate-50/85 backdrop-blur lg:block print:hidden" />

            {/* One bell for both layouts: in the mobile header next to the avatar, top-right on desktop */}
            <div className="fixed right-14 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 lg:right-8 lg:top-2 print:hidden">
                <NotificationBell />
            </div>

            <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6 print:max-w-none print:p-0">
                <div key={location.pathname} className="page-in">
                    <Outlet />
                </div>
            </main>

            <InstallGuide auto />

            {/* More sheet (mobile) */}
            {moreOpen && (
                <div className="fixed inset-0 z-40 lg:hidden print:hidden">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMoreOpen(false)} />
                    <div className="animate-slide-up absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-24">
                        <div className="mb-3 flex items-center justify-between px-1">
                            <p className="font-bold text-slate-900">More</p>
                            <button onClick={() => setMoreOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {moreItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-xs font-semibold ${
                                            isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-600'
                                        }`
                                    }
                                >
                                    <span className="relative">
                                        <item.icon size={22} />
                                        {item.badge && pending > 0 && (
                                            <span className="absolute -right-2.5 -top-2 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{pending}</span>
                                        )}
                                    </span>
                                    {item.label}
                                </NavLink>
                            ))}
                            <button onClick={doLogout} className="flex flex-col items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                                <LogOut size={22} />
                                Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom nav (mobile) */}
            <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/95 backdrop-blur lg:hidden print:hidden">
                <div className="grid grid-cols-5">
                    {mobileNav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive && !moreOpen ? 'text-brand-700' : 'text-slate-400'}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={`rounded-full px-4 py-1 transition ${isActive && !moreOpen ? 'bg-brand-50' : ''}`}>
                                        <item.icon size={20} />
                                    </span>
                                    {item.label}
                                </>
                            )}
                        </NavLink>
                    ))}
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${moreOpen || moreActive ? 'text-brand-700' : 'text-slate-400'}`}
                    >
                        <span className={`relative rounded-full px-4 py-1 transition ${moreOpen || moreActive ? 'bg-brand-50' : ''}`}>
                            <Menu size={20} />
                            {pending > 0 && <span className="absolute right-2.5 top-0.5 h-2 w-2 rounded-full bg-rose-500" />}
                        </span>
                        More
                    </button>
                </div>
            </nav>
        </div>
    );
}

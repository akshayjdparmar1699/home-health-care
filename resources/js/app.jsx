import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Spinner, ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBar from './components/OfflineBar';
import { syncManifest } from './lib/pwa';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterSuccess from './pages/RegisterSuccess';
import ClientRegister from './pages/ClientRegister';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import StaffList from './admin/StaffList';
import StaffDetail from './admin/StaffDetail';
import StaffEditor from './admin/StaffEditor';
import Applications from './admin/Applications';
import ApplicationReview from './admin/ApplicationReview';
import ClientList from './admin/ClientList';
import ClientDetail from './admin/ClientDetail';
import Assignments from './admin/Assignments';
import Attendance from './admin/Attendance';
import Billing from './admin/Billing';
import InvoiceCreate from './admin/InvoiceCreate';
import InvoiceView from './admin/InvoiceView';
import Payouts from './admin/Payouts';
import Reports from './admin/Reports';
import Settings from './pages/Settings';
import StaffLayout from './staff/StaffLayout';
import StaffHome from './staff/StaffHome';
import StaffHistory from './staff/StaffHistory';
import StaffClients from './staff/StaffClients';
import StaffEarnings from './staff/StaffEarnings';

/** Each section uses only its own login: /admin needs the admin login, /staff the staff login. */
function RequireRole({ role, children }) {
    const { sessions, loading } = useAuth();
    if (loading) return <Spinner className="min-h-screen" />;
    if (!sessions[role]) return <Navigate to={`/${role}/login`} replace />;
    return children;
}

function HomeRedirect() {
    const { sessions, loading } = useAuth();
    if (loading) return <Spinner className="min-h-screen" />;
    if (sessions.admin) return <Navigate to="/admin" replace />;
    if (sessions.staff) return <Navigate to="/staff" replace />;
    return <Navigate to="/staff/login" replace />;
}

function App() {
    const { pathname } = useLocation();
    useEffect(() => {
        syncManifest(pathname);
    }, [pathname]);

    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/staff/login" element={<Login portal="staff" />} />
            <Route path="/admin/login" element={<Login portal="admin" />} />
            <Route path="/login" element={<Navigate to="/staff/login" replace />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/success" element={<RegisterSuccess />} />
            <Route path="/client/register" element={<ClientRegister />} />
            <Route path="/client" element={<Navigate to="/client/register" replace />} />

            <Route
                path="/admin"
                element={
                    <RequireRole role="admin">
                        <AdminLayout />
                    </RequireRole>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="staff" element={<StaffList />} />
                <Route path="staff/new" element={<StaffEditor />} />
                <Route path="staff/:id" element={<StaffDetail />} />
                <Route path="staff/:id/edit" element={<StaffEditor />} />
                <Route path="applications" element={<Applications />} />
                <Route path="applications/:id" element={<ApplicationReview />} />
                <Route path="clients" element={<ClientList />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="billing" element={<Billing />} />
                <Route path="billing/new" element={<InvoiceCreate />} />
                <Route path="billing/:id" element={<InvoiceView />} />
                <Route path="payouts" element={<Payouts />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
            </Route>

            <Route
                path="/staff"
                element={
                    <RequireRole role="staff">
                        <StaffLayout />
                    </RequireRole>
                }
            >
                <Route index element={<StaffHome />} />
                <Route path="history" element={<StaffHistory />} />
                <Route path="clients" element={<StaffClients />} />
                <Route path="earnings" element={<StaffEarnings />} />
                <Route
                    path="profile"
                    element={
                        <div className="px-5 pt-6">
                            <Settings />
                        </div>
                    }
                />
            </Route>

            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}

// Offline shell + installable app. Browsers only allow this on HTTPS or localhost.
if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
    <BrowserRouter>
        <ToastProvider>
            <OfflineBar />
            <AuthProvider>
                <App />
            </AuthProvider>
        </ToastProvider>
    </BrowserRouter>
    </ErrorBoundary>,
);

import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/** Shows a friendly screen instead of a blank page if something crashes while rendering. */
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('UI crashed:', error, info?.componentStack);
    }

    reload = () => {
        try {
            localStorage.removeItem('hc_register_draft');
        } catch {
            // storage unavailable
        }
        window.location.reload();
    };

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
                <div className="w-full max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <AlertTriangle size={30} />
                    </div>
                    <h1 className="text-xl font-extrabold text-slate-900">Something went wrong</h1>
                    <p className="mt-2 text-sm text-slate-500">Please reload the page. If it keeps happening, contact the office.</p>
                    <p className="mt-3 break-words rounded-xl bg-slate-100 p-2 font-mono text-xs text-slate-500">{String(this.state.error?.message || this.state.error)}</p>
                    <button onClick={this.reload} className="btn-primary mt-6 w-full py-3">
                        <RotateCw size={18} /> Reload page
                    </button>
                </div>
            </div>
        );
    }
}

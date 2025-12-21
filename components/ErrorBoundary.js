import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { Component } from 'react';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        // Update state so that next render will show the fallback UI.
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            // Use fallback if provided, otherwise use default fallback UI
            return this.props.fallback || (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4", children: _jsx("svg", { className: "w-8 h-8 text-rose-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.235 3.175-2.502 3.175s-3.175-1.235-2.502-1.235-3.175-2.502 3.175-2.502S12.982 12.5 12.5 12.5s-.482.003-.964.003-1.451.003c-.993 0-1.82.482-2.502 1.235-2.502S8.552 9.5 7.558 9.5c-.993 0-1.82.482-2.502 1.235-2.502 1.82.482 2.502 1.235 2.502s1.82.482 2.502 1.235 2.502 3.052 12.5 2.058 12.5 2.058.483.003.964.003 1.451.003c.993 0 1.82-.482 2.502 1.235 2.502z" }) }) }), _jsx("h2", { className: "text-xl font-bold text-slate-800 mb-2", children: "Something went wrong" }), _jsx("p", { className: "text-slate-600 mb-4", children: "We encountered an error while loading this page." }), _jsxs("details", { className: "text-left text-sm text-slate-500 bg-slate-50 p-4 rounded-lg", children: [_jsx("summary", { className: "cursor-pointer font-medium", children: "Error Details" }), _jsx("pre", { className: "mt-2 text-xs overflow-auto", children: this.state.error && this.state.error.toString() })] }), _jsx("button", { onClick: () => window.location.reload(), className: "mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors", children: "Reload Page" })] }) }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;

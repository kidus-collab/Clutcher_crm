import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Pipeline from './components/Pipeline';
import Leads from './components/Leads';
import Outreach from './components/Outreach';
import FindCustomers from './components/FindCustomers';
import ClosedLeads from './components/ClosedLeads';
import OfferDeal from './components/OfferDeal';
import ErrorBoundary from './components/ErrorBoundary';
import SystemGuide from './components/SystemGuide';
const App = () => {
    return (_jsx(Router, { children: _jsx(Routes, { children: _jsxs(Route, { path: "/", element: _jsx(Layout, {}), children: [_jsx(Route, { index: true, element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "find", element: _jsx(FindCustomers, {}) }), _jsx(Route, { path: "pipeline", element: _jsx(Pipeline, {}) }), _jsx(Route, { path: "leads", element: _jsx(ErrorBoundary, { children: _jsx(Leads, {}) }) }), _jsx(Route, { path: "outreach", element: _jsx(ErrorBoundary, { children: _jsx(Outreach, {}) }) }), _jsx(Route, { path: "offers", element: _jsx(OfferDeal, {}) }), _jsx(Route, { path: "closed", element: _jsx(ClosedLeads, {}) }), _jsx(Route, { path: "guide", element: _jsx(SystemGuide, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
};
export default App;

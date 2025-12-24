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

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="find" element={<FindCustomers />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="leads" element={<ErrorBoundary><Leads /></ErrorBoundary>} />
          <Route path="outreach" element={<ErrorBoundary><Outreach /></ErrorBoundary>} />
          <Route path="offers" element={<OfferDeal />} />
          <Route path="closed" element={<ClosedLeads />} />
          <Route path="guide" element={<SystemGuide />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
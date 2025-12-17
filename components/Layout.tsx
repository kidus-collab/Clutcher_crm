import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-20 lg:ml-64 relative min-h-screen">
        {/* Subtle decorative gradients for the main content area */}
        <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-0"></div>
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
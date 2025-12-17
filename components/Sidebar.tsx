import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Users, 
  Send, 
  Hexagon,
  Search,
  Archive,
  CheckSquare,
  FileSignature
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/find', icon: Search, label: 'Find Customers' },
    { path: '/leads', icon: Users, label: 'Leads' },
    { path: '/outreach', icon: Send, label: 'Outreach' },
    { path: '/offers', icon: FileSignature, label: 'Offers' },
    { path: '/closed', icon: CheckSquare, label: 'Closed Leads' },
    { path: '/pipeline', icon: KanbanSquare, label: 'Pipeline' },
  ];

  return (
    <aside className="h-screen w-20 lg:w-64 fixed left-0 top-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-3xl border-r border-white/5 text-slate-300 shadow-2xl transition-all duration-300">
      {/* Logo Area */}
      <div className="h-24 flex items-center px-6 border-b border-white/5">
        <div className="relative flex items-center justify-center w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]">
          <Hexagon className="w-5 h-5 text-indigo-400 fill-indigo-500/20" strokeWidth={2} />
        </div>
        <div className="hidden lg:flex flex-col ml-4">
          <span className="font-bold text-white tracking-tight text-xl leading-none">Clutcher</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-8 flex flex-col gap-1.5 px-4">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`
              flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
              ${isActive(item.path) 
                ? 'bg-white/10 text-white shadow-lg shadow-black/5' 
                : 'hover:bg-white/5 hover:text-white'}
            `}
          >
            {isActive(item.path) && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-none" />
            )}
            <item.icon className={`w-5 h-5 transition-colors ${isActive(item.path) ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} strokeWidth={1.5} />
            <span className="hidden lg:block ml-3.5 text-sm font-medium tracking-wide">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      {/* Simple Footer version */}
      <div className="p-6 hidden lg:block">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <p className="text-xs text-slate-400 font-medium">Clutcher v1.0</p>
            <p className="text-[10px] text-slate-500 mt-1">Simple. Functional.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
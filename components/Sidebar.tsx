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

interface SidebarProps {
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false }) => {
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

  if (isMobile) {
    return (
      <aside className="h-full w-full flex flex-row items-center justify-between bg-slate-900/95 backdrop-blur-3xl border-t border-white/5 text-slate-300 shadow-2xl overflow-x-auto">
        <nav className="flex-1 flex flex-row justify-around items-center px-2 py-2">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`
                flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 group relative min-w-[3.5rem]
                ${isActive(item.path) 
                  ? 'text-white' 
                  : 'text-slate-500 hover:text-white'}
              `}
            >
              {isActive(item.path) && (
                <div className="absolute bottom-0 w-8 h-1 bg-indigo-500 rounded-t-lg shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
              <item.icon className={`w-6 h-6 mb-1 transition-colors ${isActive(item.path) ? 'text-indigo-400' : 'currentColor'}`} strokeWidth={1.5} />
              <span className="text-[10px] font-medium tracking-wide">{item.label.split(' ')[0]}</span>
            </Link>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="h-screen w-20 lg:w-64 fixed left-0 top-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-3xl border-r border-white/5 text-slate-300 shadow-2xl transition-all duration-300">
      {/* Logo Area */}
      <div className="h-32 flex items-center justify-center px-6 border-b border-white/5">
        <div className="hidden lg:flex flex-col items-center justify-center gap-2">
          <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-transform hover:scale-105 duration-300">
            <Hexagon className="w-9 h-9 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-white tracking-widest text-2xl leading-none uppercase">Clutcher</span>
        </div>
        {/* Tablet - icon only */}
        <div className="lg:hidden flex items-center justify-center">
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Hexagon className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
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
      
      {/* Footer */}
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
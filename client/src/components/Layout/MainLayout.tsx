import { ReactNode } from 'react';
import { 
  LayoutDashboard,
  MonitorPlay,
  ActivitySquare,
  Smartphone,
  Bot,
  GitBranch,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  CreditCard,
  LifeBuoy
} from 'lucide-react';
import Header from './Header';
import { useState } from 'react';

interface Props {
  children: ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  onManagePlan?: () => void;
  onLogout?: () => void;
}

export default function MainLayout({
  children,
  activeView,
  setActiveView,
  onManagePlan,
  onLogout
}: Props) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Testing', icon: MonitorPlay },
    { id: 'automated', label: 'Automated Runs', icon: ActivitySquare },
    { id: 'mobile', label: 'Real Devices', icon: Smartphone },
    { id: 'ci', label: 'CI/CD', icon: GitBranch },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden text-slate-200 font-sans">
      <Header
        rightPanelCollapsed={true}
        onToggleRightPanel={() => {}}
        onManagePlan={onManagePlan}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <aside 
          className={`transition-all duration-300 ease-in-out border-r border-surface-600/30 bg-surface-900/50 backdrop-blur-xl flex flex-col justify-between overflow-hidden relative z-30 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="flex-1 py-6 overflow-y-auto no-scrollbar">
            <div className="px-4 mb-8 flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-2">
                  Main Menu
                </h2>
              )}
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-500 transition-colors ml-auto"
              >
                {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            <nav className="px-3 space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveView(item.id)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-brand-500 text-black shadow-lg shadow-brand-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-800'
                    }`}
                  >
                    <div className={`shrink-0 ${isActive ? 'text-black' : 'text-slate-500 group-hover:text-brand-500'}`}>
                      <Icon size={20} />
                    </div>
                    {!isSidebarCollapsed && (
                      <span className={`text-[13px] font-black tracking-tight ${isActive ? 'text-black' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    )}
                    {isSidebarCollapsed && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-surface-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-surface-600/50">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-surface-600/30 space-y-1 bg-surface-900/80">
            <button className="group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-100 hover:bg-surface-800 transition-all duration-200 text-[13px] font-black">
              <Settings size={18} className="text-slate-500 group-hover:text-brand-500" />
              {!isSidebarCollapsed && <span>Settings</span>}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-surface-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-surface-600/50">
                  Settings
                </div>
              )}
            </button>
            <button 
              onClick={onLogout}
              className="group relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-accent-red hover:bg-accent-red/10 transition-all duration-200 text-[13px] font-black"
            >
              <LogOut size={18} className="text-slate-500 group-hover:text-accent-red" />
              {!isSidebarCollapsed && <span>Log Out</span>}
              {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-surface-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-surface-600/50">
                  Log Out
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-950 relative">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent-info/10 blur-[100px] rounded-full"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

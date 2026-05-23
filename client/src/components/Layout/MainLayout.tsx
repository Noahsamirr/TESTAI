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
} from 'lucide-react';
import Header from './Header';

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
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Testing', icon: MonitorPlay },
    { id: 'automated', label: 'Automated Runs', icon: ActivitySquare },
    { id: 'mobile', label: 'Real Devices', icon: Smartphone },
    { id: 'ci', label: 'CI/CD', icon: GitBranch },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden text-slate-200">
      <Header
        rightPanelCollapsed={true}
        onToggleRightPanel={() => {}}
        onManagePlan={onManagePlan}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className="w-64 shrink-0 border-r border-surface-600 bg-surface-900 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 py-6 overflow-y-auto">
            <div className="px-4 mb-2">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Products
              </h2>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-500'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-surface-800'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-brand-500' : 'text-slate-500'} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
          <div className="p-4 border-t border-surface-600">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-800 transition-colors text-sm font-medium mb-1">
              <Settings size={18} />
              Settings
            </button>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-800 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface-950">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

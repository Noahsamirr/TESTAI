import React, { ReactNode, useState } from 'react';
import {
  LayoutDashboard, MonitorPlay, ActivitySquare, Smartphone,
  Bot, GitBranch, Settings, LogOut, ChevronLeft, ChevronRight,
  Eye, Zap, Shield, FlaskConical, ShieldCheck, ChevronDown,
  Bell, Search, User, Database, Globe, Cpu, Sparkles,
} from 'lucide-react';

interface Props {
  children: ReactNode;
  activeView: string;
  setActiveView: (view: string) => void;
  onManagePlan?: () => void;
  onLogout?: () => void;
}

const NAV: {
  label: string;
  items: { id: string; label: string; icon: React.FC<any>; badge?: string }[];
}[] = [
  {
    label: 'Quality Platform',
    items: [
      { id: 'dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
      { id: 'live',        label: 'Live Testing',    icon: MonitorPlay },
      { id: 'automated',  label: 'Automated Runs',  icon: ActivitySquare },
      { id: 'mobile',     label: 'Real Devices',    icon: Smartphone },
    ],
  },
  {
    label: 'Test Modules',
    items: [
      { id: 'visual',      label: 'Visual & A11y',  icon: Eye },
      { id: 'performance', label: 'Performance',    icon: Zap },
      { id: 'security',    label: 'Security',       icon: Shield },
      { id: 'ai-evals',   label: 'AI Evals',       icon: FlaskConical, badge: 'NEW' },
    ],
  },
  {
    label: 'AI & Automation',
    items: [
      { id: 'agents',      label: 'AI Agents',      icon: Cpu, badge: 'NEW' },
      { id: 'ai',          label: 'AI Assistant',   icon: Bot },
      { id: 'ci',          label: 'CI / CD',        icon: GitBranch },
    ],
  },
  {
    label: 'Utilities',
    items: [
      { id: 'api-testing', label: 'API Testing',    icon: Globe, badge: 'NEW' },
      { id: 'test-data',   label: 'Test Data',      icon: Database, badge: 'NEW' },
    ],
  },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard:     { title: 'Dashboard',       subtitle: 'Platform overview' },
  live:          { title: 'Live Testing',    subtitle: 'Cross-browser sessions' },
  automated:     { title: 'Automated Runs',  subtitle: 'CI-triggered test history' },
  mobile:        { title: 'Real Devices',    subtitle: 'Mobile device cloud' },
  visual:        { title: 'Visual & A11y',   subtitle: 'WCAG 2.2 accessibility scans' },
  performance:   { title: 'Performance',     subtitle: 'k6 load & stress testing' },
  security:      { title: 'Security',        subtitle: 'DAST + SCA scanning' },
  'ai-evals':    { title: 'AI Evals',        subtitle: 'LLM-as-judge evaluation suite' },
  ci:            { title: 'CI / CD',         subtitle: 'Pipeline integrations' },
  ai:            { title: 'AI Assistant',    subtitle: 'Test planning & generation' },
  agents:        { title: 'AI Agents',       subtitle: 'Multi-agent orchestration' },
  'api-testing': { title: 'API Testing',     subtitle: 'REST, GraphQL & OpenAPI' },
  'test-data':   { title: 'Test Data',       subtitle: 'Synthetic data factory — 12 types, 9 locales' },
  settings:      { title: 'Settings',        subtitle: 'Profile, providers & team' },
};

export default function MainLayout({ children, activeView, setActiveView, onManagePlan, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const page = PAGE_TITLES[activeView] || { title: 'TestMind AI', subtitle: '' };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--content-bg)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={`sidebar flex flex-col transition-all duration-300 ease-in-out shrink-0 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 h-14 shrink-0 border-b ${collapsed ? 'justify-center px-2' : ''}`}
          style={{ borderColor: 'var(--sidebar-border)' }}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Sparkles size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-white font-bold text-[13px] truncate tracking-tight">TestMind AI</span>
              <span className="text-indigo-400 text-[10px] font-medium">Enterprise Platform</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
          {NAV.map((section) => (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="sidebar-section-label">{section.label}</p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => setActiveView(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`sidebar-nav-item w-full text-left group nav-item-ripple ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 mx-0 w-[60px] rounded-none' : ''}`}
                    style={collapsed ? { margin: '1px 0', borderRadius: 0, padding: '10px 0', justifyContent: 'center' } : {}}
                  >
                    <Icon
                      size={16}
                      className={`shrink-0 transition-all duration-200 ${isActive ? 'text-indigo-400 scale-110' : 'text-[#4a5568] group-hover:text-[#a0aec0] group-hover:scale-105'}`}
                    />
                    {!collapsed && (
                      <span className={`flex-1 truncate transition-all duration-200 ${isActive ? 'translate-x-[1px]' : ''}`}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="text-[9px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {!collapsed && isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulseSoft" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="shrink-0 border-t py-2" style={{ borderColor: 'var(--sidebar-border)' }}>
          <button
            onClick={() => setActiveView('settings')}
            className={`sidebar-nav-item w-full text-left ${collapsed ? 'justify-center px-0 mx-0 w-[60px] rounded-none' : ''} ${activeView === 'settings' ? 'active' : ''}`}
            style={collapsed ? { margin: '1px 0', borderRadius: 0, padding: '9px 0', justifyContent: 'center' } : {}}
          >
            <Settings size={15} className={`shrink-0 ${activeView === 'settings' ? 'text-indigo-400' : 'text-[#4a5568] group-hover:text-[#a0aec0]'}`} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            onClick={onLogout}
            className={`sidebar-nav-item w-full text-left ${collapsed ? 'justify-center px-0 mx-0 w-[60px] rounded-none' : ''}`}
            style={collapsed ? { margin: '1px 0', borderRadius: 0, padding: '9px 0', justifyContent: 'center' } : {}}
          >
            <LogOut size={15} className="text-[#4a5568] group-hover:text-red-400 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`sidebar-nav-item w-full text-left ${collapsed ? 'justify-center px-0 mx-0 w-[60px] rounded-none' : ''}`}
            style={collapsed ? { margin: '1px 0', borderRadius: 0, padding: '9px 0', justifyContent: 'center' } : {}}
          >
            {collapsed
              ? <ChevronRight size={14} className="text-[#4a5568]" />
              : <><ChevronLeft size={14} className="text-[#4a5568]" /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>
      </aside>

      {/* ── Main Column ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top Header (Testomat-style) ───────────────────────────────── */}
        <header className="tm-header h-14 flex items-center justify-between px-6 shrink-0">
          {/* Page breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-700 truncate" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              {page.title}
            </h1>
            {page.subtitle && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span className="text-[13px] truncate" style={{ color: 'var(--text-tertiary)' }}>{page.subtitle}</span>
              </>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search…"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                className="tm-input pl-8 pr-3 h-8 text-xs w-48 focus:w-64 transition-all"
                style={{ fontSize: 12 }}
              />
            </div>

            {/* Notifications */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative">
              <Bell size={15} style={{ color: 'var(--text-tertiary)' }} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            </button>

            {/* User avatar */}
            <button
              onClick={onManagePlan}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <User size={14} className="text-indigo-600" />
              </div>
              <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </header>

        {/* ── Page Content ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

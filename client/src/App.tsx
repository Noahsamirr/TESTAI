import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import SubscriptionModal from './components/Auth/SubscriptionModal';
import MainLayout from './components/Layout/MainLayout';
import DashboardView from './components/Dashboard/DashboardView';
import LiveTestingView from './components/LiveTesting/LiveTestingView';
import AutomatedRunsView from './components/Automated/AutomatedRunsView';
import MobileDevicesView from './components/Mobile/MobileDevicesView';
import AIAssistantView from './components/AIAssistant/AIAssistantView';
import CIIntegrationsView from './components/Integrations/CIIntegrationsView';

const VisualAccessibilityView = lazy(() => import('./components/VisualAccessibility/VisualAccessibilityView'));
const PerformanceView = lazy(() => import('./components/Performance/PerformanceView'));
const SecurityView = lazy(() => import('./components/Security/SecurityView'));
const AIEvalsView = lazy(() => import('./components/AIEvals/AIEvalsView'));
const AgentsView = lazy(() => import('./components/Agents/AgentsView'));
const APITestingView = lazy(() => import('./components/APITesting/APITestingView'));
const TestDataView = lazy(() => import('./components/TestData/TestDataView'));
const SettingsView = lazy(() => import('./components/Settings/SettingsView'));

function ModuleLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Loading module…</p>
      </div>
    </div>
  );
}

const VIEW_ORDER = [
  'dashboard', 'live', 'automated', 'mobile',
  'visual', 'performance', 'security', 'ai-evals',
  'ci', 'ai', 'agents', 'api-testing', 'test-data', 'settings',
];

function AppContent() {
  const { isLoading, isAuthenticated, logout } = useAuth();
  const [showPlans, setShowPlans] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [displayView, setDisplayView] = useState('dashboard');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNavigate = useCallback((next: string) => {
    if (next === activeView) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsTransitioning(true);

    timeoutRef.current = setTimeout(() => {
      setActiveView(next);
      setDisplayView(next);
      setTransitionKey((k) => k + 1);
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 120);
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading QualityForge…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderView = () => {
    const view = displayView;
    const keyedContent = (children: React.ReactNode) => (
      <div key={`${view}-${transitionKey}`} className={`page-container ${isTransitioning ? 'page-exit' : ''}`}>
        {children}
      </div>
    );

    switch (view) {
      case 'dashboard':
        return keyedContent(<DashboardView onNavigate={handleNavigate} />);
      case 'live':
        return keyedContent(<LiveTestingView />);
      case 'automated':
        return keyedContent(<AutomatedRunsView onGoToAi={() => handleNavigate('ai')} />);
      case 'mobile':
        return keyedContent(<MobileDevicesView />);
      case 'ci':
        return keyedContent(<CIIntegrationsView />);
      case 'ai':
        return keyedContent(<AIAssistantView />);
      case 'visual':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <VisualAccessibilityView />
          </Suspense>
        );
      case 'performance':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <PerformanceView />
          </Suspense>
        );
      case 'security':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <SecurityView />
          </Suspense>
        );
      case 'ai-evals':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <AIEvalsView />
          </Suspense>
        );
      case 'agents':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <AgentsView />
          </Suspense>
        );
      case 'api-testing':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <APITestingView />
          </Suspense>
        );
      case 'test-data':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <TestDataView />
          </Suspense>
        );
      case 'settings':
        return keyedContent(
          <Suspense fallback={<ModuleLoader />}>
            <SettingsView />
          </Suspense>
        );
      default:
        return keyedContent(<DashboardView onNavigate={handleNavigate} />);
    }
  };

  return (
    <>
      <div className={`page-transition-indicator ${isTransitioning ? 'active' : ''}`} />
      <MainLayout
        activeView={activeView}
        setActiveView={handleNavigate}
        onManagePlan={() => setShowPlans(true)}
        onLogout={logout}
      >
        {renderView()}
      </MainLayout>
      <SubscriptionModal open={showPlans} onClose={() => setShowPlans(false)} />
    </>
  );
}

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}


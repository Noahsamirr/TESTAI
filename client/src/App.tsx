import { useState } from 'react';
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

function AppContent() {
  const { isLoading, isAuthenticated, logout } = useAuth();
  const [showPlans, setShowPlans] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveView} />;
      case 'live':
        return <LiveTestingView />;
      case 'automated':
        return <AutomatedRunsView onGoToAi={() => setActiveView('ai')} />;
      case 'mobile':
        return <MobileDevicesView />;
      case 'ci':
        return <CIIntegrationsView />;
      case 'ai':
        return <AIAssistantView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <MainLayout
        activeView={activeView}
        setActiveView={setActiveView}
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

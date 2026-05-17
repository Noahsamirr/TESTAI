import { ReactNode } from 'react';
import Header from './Header';

interface Props {
  sidebar: ReactNode;
  chat: ReactNode;
  rightPanel: ReactNode;
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
  onManagePlan?: () => void;
}

export default function MainLayout({
  sidebar,
  chat,
  rightPanel,
  rightPanelCollapsed,
  onToggleRightPanel,
  onManagePlan,
}: Props) {
  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      <Header
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleRightPanel={onToggleRightPanel}
        onManagePlan={onManagePlan}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[260px] shrink-0 border-r border-surface-600 bg-surface-800 flex flex-col p-4 overflow-hidden">
          {sidebar}
        </aside>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">{chat}</main>
        {!rightPanelCollapsed && (
          <aside className="w-[420px] shrink-0 border-l border-surface-600 bg-surface-800 flex flex-col overflow-hidden">
            <div className="p-4 flex-1 overflow-y-auto">{rightPanel}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

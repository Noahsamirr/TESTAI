import { PanelRightClose, PanelRightOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAiProvider } from '../../hooks/useAiProvider';
import TokenBar from './TokenBar';

interface Props {
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
  onManagePlan?: () => void;
}

export default function Header({ rightPanelCollapsed, onToggleRightPanel, onManagePlan }: Props) {
  const { user, logout } = useAuth();
  const aiLabel = useAiProvider();

  return (
    <header className="h-14 border-b border-surface-600 flex items-center justify-between px-4 bg-surface-800 shrink-0 gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className="font-semibold text-brand-400 tracking-tight">TestMind</span>
        <span className="text-xs text-gray-500 hidden sm:inline">
          {aiLabel ?? 'QA Automation Agent'}
        </span>
      </div>
      <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
        <TokenBar onManagePlan={onManagePlan} />
        {user && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 border-l border-surface-600 pl-3">
            <span className="text-xs text-gray-400 truncate max-w-[120px]" title={user.email}>
              {user.name || user.email}
            </span>
            <button
              type="button"
              onClick={logout}
              className="p-2 hover:bg-surface-700 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
        <button
          onClick={onToggleRightPanel}
          className="p-2 hover:bg-surface-700 rounded-lg transition-colors text-gray-400 shrink-0"
          title={rightPanelCollapsed ? 'Show panel' : 'Hide panel'}
        >
          {rightPanelCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
        </button>
      </div>
    </header>
  );
}

import { PanelRightClose, PanelRightOpen, LogOut, Sun, Moon, Zap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAiProvider } from '../../hooks/useAiProvider';
import { useAppTheme } from '../../context/ThemeContext';
import TokenBar from './TokenBar';

interface Props {
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
  onManagePlan?: () => void;
}

export default function Header({ rightPanelCollapsed, onToggleRightPanel, onManagePlan }: Props) {
  const { user, logout } = useAuth();
  const aiLabel = useAiProvider();
  const { theme, toggleTheme, isDark } = useAppTheme();

  return (
    <header className="h-16 border-b border-surface-600/30 flex items-center justify-between px-6 bg-surface-900/80 backdrop-blur-xl shrink-0 gap-4 transition-all duration-300 z-50 sticky top-0">
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 group cursor-default">
           <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:rotate-12 transition-transform duration-300">
              <Zap size={16} className="text-black" />
           </div>
           <span className="font-black text-white tracking-tighter text-xl italic">TestMind</span>
        </div>
        
        {aiLabel && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-800 border border-surface-600/50 shadow-sm animate-in fade-in slide-in-from-left-2 duration-500">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
             <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
               {aiLabel}
             </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
        <TokenBar onManagePlan={onManagePlan} />
        
        <div className="h-6 w-px bg-surface-600/30 mx-1"></div>

        <button
          onClick={toggleTheme}
          className="p-2.5 hover:bg-surface-800 rounded-xl transition-all duration-200 text-slate-400 hover:text-brand-500 shrink-0 flex items-center justify-center relative group"
          title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
        >
          {isDark ? (
            <Sun size={20} className="transition-transform duration-500 group-hover:rotate-90" />
          ) : (
            <Moon size={20} className="transition-transform duration-500 group-hover:-rotate-12" />
          )}
        </button>

        {user && (
          <div className="hidden sm:flex items-center gap-3 shrink-0 pl-1">
            <div className="flex flex-col items-end mr-1">
               <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
                 {user.name || user.email.split('@')[0]}
               </span>
               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                 {user.plan || 'Free'} Plan
               </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-surface-800 border border-surface-600/50 flex items-center justify-center text-brand-500 shadow-panel">
               <ShieldCheck size={18} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

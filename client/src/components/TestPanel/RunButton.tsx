import { Loader2, Play } from 'lucide-react';

interface Props {
  onRun: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export default function RunButton({ onRun, isRunning, disabled }: Props) {
  return (
    <button
      onClick={onRun}
      disabled={isRunning || disabled}
      className="w-full flex items-center justify-center gap-2 py-3 bg-accent-green text-black font-semibold rounded-xl hover:bg-brand-500 disabled:opacity-50 transition-colors mt-4"
    >
      {isRunning ? (
        <>
          <Loader2 size={18} className="animate-spin" /> Running Tests...
        </>
      ) : (
        <>
          <Play size={18} /> Run Tests
        </>
      )}
    </button>
  );
}

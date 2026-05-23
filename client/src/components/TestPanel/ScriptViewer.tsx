import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Download, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { GeneratedScript } from '../../types';

interface Props {
  script: GeneratedScript;
}

export default function ScriptViewer({ script }: Props) {
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(true);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([script.code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-${Date.now()}.spec.ts`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs px-2 py-1 bg-accent-green/20 text-accent-green rounded-full border border-accent-green/30">
          {script.framework}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
        >
          {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
        >
          <Download size={14} /> Download
        </button>
      </div>

      <div className="bg-black rounded-lg px-3 py-2 mb-3 font-mono text-xs text-gray-400 border border-surface-600">
        <span className="text-accent-green">$</span> {script.runCommand}
      </div>

      <div className="flex-1 overflow-auto rounded-lg mb-3">
        <SyntaxHighlighter
          style={oneDark}
          language="typescript"
          customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.75rem' }}
        >
          {script.code}
        </SyntaxHighlighter>
      </div>

      {(script.dependencies || []).length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Dependencies</p>
          <div className="flex flex-wrap gap-1">
            {(script.dependencies || []).map((dep) => (
              <span key={dep} className="text-xs px-2 py-0.5 bg-surface-900 text-gray-400 rounded font-mono">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {(script.explanation || []).length > 0 && (
        <div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-xs text-accent-green mb-2"
          >
            {showExplanation ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            Script Explanation
          </button>
          {showExplanation && (
            <div className="space-y-2">
              {(script.explanation || []).map((section, i) => (
                <div key={i} className="bg-surface-700 rounded-lg p-3 border border-surface-600">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-200">{section.section}</span>
                    <span className="text-xs px-2 py-0.5 bg-surface-900 text-gray-500 rounded font-mono">
                      {section.lineRange}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{section.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

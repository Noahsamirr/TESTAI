import { useEffect, useState } from 'react';
import { GitBranch, Copy, Check, Cloud } from 'lucide-react';
import { getCiTemplate, getPlatformCapabilities, getTunnelStatus } from '../../services/api';
import type { CiTemplate } from '../../types/platform';

export default function CIIntegrationsView() {
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState('github-actions');
  const [template, setTemplate] = useState<CiTemplate | null>(null);
  const [tunnel, setTunnel] = useState<{
    status: string;
    instructions: string;
    localUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [projectName, setProjectName] = useState('testmind-app');

  useEffect(() => {
    getPlatformCapabilities().then((d) => setProviders(d.ciProviders || []));
    getTunnelStatus().then(setTunnel).catch(() => null);
  }, []);

  useEffect(() => {
    getCiTemplate(selected, { projectName })
      .then(setTemplate)
      .catch(() => setTemplate(null));
  }, [selected, projectName]);

  const copyTemplate = () => {
    if (!template?.content) return;
    navigator.clipboard.writeText(template.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <GitBranch className="text-brand-500" /> CI/CD Integrations
        </h1>
        <p className="text-slate-400">
          Pipeline templates for parallel cross-browser runs — like Sauce Labs + your CI.
        </p>
      </div>

      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Generate pipeline config</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-slate-500 uppercase block mb-1">Provider</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-2 px-3 text-slate-200"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase block mb-1">Project name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-2 px-3 text-slate-200"
            />
          </div>
        </div>

        {template && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-400 font-mono">{template.filename}</span>
              <button
                type="button"
                onClick={copyTemplate}
                className="btn-ghost py-1 px-3 flex items-center gap-2 text-sm"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="bg-surface-950 border border-surface-700 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto max-h-96">
              {template.content}
            </pre>
          </>
        )}
      </div>

      {tunnel && (
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-2 flex items-center gap-2">
            <Cloud size={20} className="text-brand-500" /> Local tunnel (Sauce Connect–style)
          </h2>
          <p className="text-sm text-slate-400 mb-2">
            Status:{' '}
            <span
              className={
                tunnel.status === 'connected' ? 'text-accent-success' : 'text-slate-500'
              }
            >
              {tunnel.status}
            </span>
          </p>
          <p className="text-sm text-slate-500">{tunnel.instructions}</p>
        </div>
      )}
    </div>
  );
}

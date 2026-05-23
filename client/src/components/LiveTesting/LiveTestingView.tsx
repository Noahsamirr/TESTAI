import { useState } from 'react';
import { MonitorPlay, Globe, Play, CheckCircle } from 'lucide-react';
import { startLiveSession } from '../../services/api';
import type { LiveSessionResult } from '../../types/platform';

export default function LiveTestingView() {
  const [os, setOs] = useState('macOS 14');
  const [browser, setBrowser] = useState('Chrome 120');
  const [resolution, setResolution] = useState('1920x1080');
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<LiveSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLaunch = async () => {
    setLoading(true);
    setError(null);
    setSession(null);
    try {
      const result = await startLiveSession({ url, browser, os, resolution });
      setSession(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const screenshotUrl =
    session?.screenshotPath &&
    `/api/platform/screenshots/${session.screenshotPath.split('/').pop()}`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <MonitorPlay className="text-brand-500" /> Live Cross-Browser Testing
        </h1>
        <p className="text-slate-400">
          Interactive sessions across browser and OS combinations with screenshot capture.
        </p>
      </div>

      <div className="panel p-8 mb-8">
        <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
          Target URL
        </label>
        <div className="relative mb-6">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-surface-900 border-2 border-surface-600 rounded-xl py-4 pl-12 pr-4 text-slate-100 font-mono text-lg focus:outline-none focus:border-brand-500"
            placeholder="https://example.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">OS</label>
            <select
              value={os}
              onChange={(e) => setOs(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-3 px-4 text-slate-200"
            >
              <option>macOS 14</option>
              <option>macOS 13</option>
              <option>Windows 11</option>
              <option>Windows 10</option>
              <option>Ubuntu 22.04</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Browser</label>
            <select
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-3 px-4 text-slate-200"
            >
              <option>Chrome 120</option>
              <option>Firefox 121</option>
              <option>Safari 17</option>
              <option>Edge 120</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg py-3 px-4 text-slate-200"
            >
              <option>1920x1080</option>
              <option>1440x900</option>
              <option>1366x768</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="text-accent-danger text-sm mb-4">{error}</p>
        )}

        <button
          type="button"
          onClick={handleLaunch}
          disabled={loading || !url.startsWith('http')}
          className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-pulse">Provisioning session…</span>
          ) : (
            <>
              <Play size={24} /> Start Session
            </>
          )}
        </button>
      </div>

      {session && (
        <div className="panel p-6">
          <div className="flex items-center gap-2 text-accent-success mb-4">
            <CheckCircle size={20} />
            <span className="font-semibold">Session {session.sessionId.slice(0, 8)} active</span>
          </div>
          <p className="text-sm text-slate-400 mb-4">{session.message}</p>
          {screenshotUrl && (
            <div className="rounded-lg overflow-hidden border border-surface-600">
              <img src={screenshotUrl} alt="Live session screenshot" className="w-full" />
            </div>
          )}
          <a
            href={session.viewerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-4 text-brand-500 hover:text-brand-400 text-sm"
          >
            Open URL in new tab →
          </a>
        </div>
      )}
    </div>
  );
}

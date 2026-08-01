import React, { useState, useRef } from 'react';
import {
  Globe, Plus, Send, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Copy, Download,
  Shield, Key, Link2, FileJson, Zap, Code2, Play, Loader2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';
type AssertionType = 'status' | 'header' | 'body' | 'json-path' | 'response-time';

interface Assertion {
  id: string;
  type: AssertionType;
  field?: string;
  operator: string;
  expected: string;
}

interface ApiRequest {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  authType: AuthType;
  authValue: string;
  authExtra: string;
  assertions: Assertion[];
}

interface ApiResult {
  requestId: string;
  requestName: string;
  passed: boolean;
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    bodyText: string;
    responseTimeMs: number;
    size: number;
  } | null;
  assertions: { passed: boolean; message: string }[];
  error?: string;
  durationMs: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-emerald-400 bg-emerald-500/10',
  POST: 'text-blue-400 bg-blue-500/10',
  PUT: 'text-amber-400 bg-amber-500/10',
  PATCH: 'text-orange-400 bg-orange-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
  HEAD: 'text-slate-400 bg-slate-500/10',
};

const newRequest = (name = 'New Request'): ApiRequest => ({
  id: crypto.randomUUID(),
  name,
  url: '',
  method: 'GET',
  headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
  body: '',
  authType: 'none',
  authValue: '',
  authExtra: '',
  assertions: [{ id: crypto.randomUUID(), type: 'status', operator: 'eq', expected: '200' }],
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function APITestingView() {
  const [requests, setRequests] = useState<ApiRequest[]>([newRequest('GET /api/health')]);
  const [activeReqId, setActiveReqId] = useState(requests[0].id);
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'assertions'>('params');
  const [showResponse, setShowResponse] = useState(true);
  const [suiteName, setSuiteName] = useState('My API Suite');
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [graphqlMode, setGraphqlMode] = useState(false);
  const [gqlQuery, setGqlQuery] = useState('{\n  __typename\n}');
  const [validateSpecUrl, setValidateSpecUrl] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; endpoints: number } | null>(null);

  const getToken = () => localStorage.getItem('testmind_token') ?? '';

  const activeReq = requests.find((r) => r.id === activeReqId) ?? requests[0];

  const updateRequest = (updates: Partial<ApiRequest>) => {
    setRequests((prev) => prev.map((r) => r.id === activeReqId ? { ...r, ...updates } : r));
  };

  const addRequest = () => {
    const req = newRequest(`Request ${requests.length + 1}`);
    setRequests((prev) => [...prev, req]);
    setActiveReqId(req.id);
  };

  const deleteRequest = (id: string) => {
    const remaining = requests.filter((r) => r.id !== id);
    setRequests(remaining);
    if (activeReqId === id) setActiveReqId(remaining[0]?.id ?? '');
  };

  const buildApiRequest = (req: ApiRequest) => {
    const headers: Record<string, string> = {};
    req.headers.filter((h) => h.enabled && h.key).forEach((h) => { headers[h.key] = h.value; });

    let body: unknown;
    if (req.body.trim()) {
      try { body = JSON.parse(req.body); } catch { body = req.body; }
    }

    let auth: Record<string, string> | undefined;
    if (req.authType !== 'none') {
      auth = { type: req.authType };
      if (req.authType === 'bearer') auth['token'] = req.authValue;
      if (req.authType === 'basic') { auth['username'] = req.authValue; auth['password'] = req.authExtra; }
      if (req.authType === 'api-key') { auth['apiKey'] = req.authValue; auth['apiKeyHeader'] = req.authExtra || 'X-API-Key'; }
    }

    const assertions = req.assertions.map((a) => ({
      type: a.type,
      field: a.field,
      operator: a.operator,
      expected: a.type === 'status' || a.type === 'response-time' ? Number(a.expected) : a.expected,
    }));

    return { id: req.id, name: req.name, url: req.url, method: req.method, headers, body, auth, assertions };
  };

  const runSingle = async (reqId: string) => {
    const req = requests.find((r) => r.id === reqId);
    if (!req?.url) return;

    setIsRunning((prev) => ({ ...prev, [reqId]: true }));
    setResults((prev) => { const n = { ...prev }; delete n[reqId]; return n; });

    try {
      const resp = await fetch('/api/api-testing/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(buildApiRequest(req)),
      });
      const data = await resp.json() as { result: ApiResult };
      if (data.result) setResults((prev) => ({ ...prev, [reqId]: data.result }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [reqId]: { requestId: reqId, requestName: req.name, passed: false, response: null, assertions: [], error: String(err), durationMs: 0 },
      }));
    } finally {
      setIsRunning((prev) => ({ ...prev, [reqId]: false }));
    }
  };

  const runSuite = async () => {
    setIsRunningSuite(true);
    try {
      const resp = await fetch('/api/api-testing/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: suiteName, requests: requests.map(buildApiRequest) }),
      });
      const data = await resp.json() as { suite: { results: ApiResult[] } };
      if (data.suite?.results) {
        const resultMap: Record<string, ApiResult> = {};
        for (const r of data.suite.results) resultMap[r.requestId ?? ''] = r;
        setResults(resultMap);
      }
    } finally {
      setIsRunningSuite(false);
    }
  };

  const runGraphQL = async () => {
    if (!activeReq.url) return;
    setIsRunning((prev) => ({ ...prev, [activeReqId]: true }));
    try {
      let variables: Record<string, unknown> = {};
      try { variables = JSON.parse(activeReq.body || '{}'); } catch {}
      const resp = await fetch('/api/api-testing/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ url: activeReq.url, query: gqlQuery, variables }),
      });
      const data = await resp.json() as { result: ApiResult };
      if (data.result) setResults((prev) => ({ ...prev, [activeReqId]: data.result }));
    } finally {
      setIsRunning((prev) => ({ ...prev, [activeReqId]: false }));
    }
  };

  const validateSpec = async () => {
    if (!validateSpecUrl) return;
    try {
      const resp = await fetch('/api/api-testing/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ specUrl: validateSpecUrl }),
      });
      const data = await resp.json() as { validation: typeof validationResult };
      setValidationResult(data.validation);
    } catch {}
  };

  const result = results[activeReqId];
  const running = isRunning[activeReqId];

  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-emerald-400 bg-emerald-500/10';
    if (code >= 300 && code < 400) return 'text-blue-400 bg-blue-500/10';
    if (code >= 400 && code < 500) return 'text-amber-400 bg-amber-500/10';
    return 'text-red-400 bg-red-500/10';
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--content-bg)' }}>
      {/* Request List */}
      <div className="w-56 border-r flex flex-col shrink-0" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
        <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--sidebar-border)' }}>
          <span className="text-xs font-semibold text-slate-300">Requests</span>
          <button onClick={addRequest} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700/60 text-slate-400 hover:text-white transition-colors">
            <Plus size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {requests.map((req) => {
            const res = results[req.id];
            return (
              <div key={req.id} className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700/40 transition-colors ${activeReqId === req.id ? 'bg-slate-700/60' : ''}`} onClick={() => setActiveReqId(req.id)}>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${METHOD_COLORS[req.method]}`}>{req.method}</span>
                <span className="flex-1 text-xs text-slate-300 truncate">{req.name || req.url || 'Untitled'}</span>
                {res && (res.passed ? <CheckCircle2 size={10} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={10} className="text-red-400 flex-shrink-0" />)}
                <button onClick={(e) => { e.stopPropagation(); deleteRequest(req.id); }} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:text-red-400 text-slate-500 transition-all">
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Suite actions */}
        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--sidebar-border)' }}>
          <input
            type="text"
            placeholder="Suite name"
            value={suiteName}
            onChange={(e) => setSuiteName(e.target.value)}
            className="tm-input w-full text-xs py-1.5"
          />
          <button onClick={runSuite} disabled={isRunningSuite} className="btn-primary w-full flex items-center justify-center gap-1.5 py-1.5 text-xs">
            {isRunningSuite ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            Run All
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* URL Bar */}
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--sidebar-border)' }}>
          <select
            value={activeReq.method}
            onChange={(e) => updateRequest({ method: e.target.value as HttpMethod })}
            className={`tm-input text-xs font-bold px-2 py-1.5 ${METHOD_COLORS[activeReq.method]}`}
            style={{ width: 90 }}
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as HttpMethod[]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="https://api.example.com/endpoint"
            value={activeReq.url}
            onChange={(e) => updateRequest({ url: e.target.value })}
            className="tm-input flex-1 text-sm font-mono"
          />

          <input
            type="text"
            placeholder="Request name"
            value={activeReq.name}
            onChange={(e) => updateRequest({ name: e.target.value })}
            className="tm-input text-xs"
            style={{ width: 160 }}
          />

          <button
            onClick={() => graphqlMode ? runGraphQL() : runSingle(activeReqId)}
            disabled={running || !activeReq.url}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>

          <button
            onClick={() => setGraphqlMode(!graphqlMode)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${graphqlMode ? 'border-pink-500/50 bg-pink-500/10 text-pink-400' : 'border-slate-700/50 text-slate-400 hover:text-white'}`}
          >
            GQL
          </button>
        </div>

        {/* Request Tabs */}
        <div className="border-b flex items-center px-4" style={{ borderColor: 'var(--sidebar-border)' }}>
          {(['params', 'auth', 'headers', 'body', 'assertions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Params / General */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              {graphqlMode ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">GraphQL Query</label>
                  <textarea
                    rows={8}
                    value={gqlQuery}
                    onChange={(e) => setGqlQuery(e.target.value)}
                    className="tm-input w-full font-mono text-xs resize-none"
                    style={{ minHeight: 180 }}
                  />
                  <label className="block text-[11px] font-medium text-slate-400 mt-3 mb-1.5 uppercase tracking-wider">Variables (JSON)</label>
                  <textarea
                    rows={3}
                    value={activeReq.body}
                    onChange={(e) => updateRequest({ body: e.target.value })}
                    placeholder="{}"
                    className="tm-input w-full font-mono text-xs resize-none"
                  />
                </div>
              ) : (
                <div>
                  {/* OpenAPI Validation */}
                  <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileJson size={14} className="text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-300">OpenAPI / Swagger Validation</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://api.example.com/openapi.json"
                        value={validateSpecUrl}
                        onChange={(e) => setValidateSpecUrl(e.target.value)}
                        className="tm-input flex-1 text-xs"
                      />
                      <button onClick={validateSpec} className="btn-secondary text-xs px-3">Validate</button>
                    </div>
                    {validationResult && (
                      <div className={`mt-3 p-3 rounded-lg text-xs border ${validationResult.valid ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                        <p className={`font-semibold ${validationResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {validationResult.valid ? '✓ Valid OpenAPI Spec' : '✗ Validation Failed'}
                          {validationResult.valid && ` — ${validationResult.endpoints} endpoints`}
                        </p>
                        {validationResult.errors.map((e, i) => (
                          <p key={i} className="text-red-300 mt-1">{e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth */}
          {activeTab === 'auth' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Auth Type</label>
                <select value={activeReq.authType} onChange={(e) => updateRequest({ authType: e.target.value as AuthType })} className="tm-input text-sm">
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="api-key">API Key</option>
                </select>
              </div>

              {activeReq.authType === 'bearer' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Token</label>
                  <div className="relative">
                    <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="password" value={activeReq.authValue} onChange={(e) => updateRequest({ authValue: e.target.value })} placeholder="Bearer token" className="tm-input pl-9 w-full text-sm font-mono" />
                  </div>
                </div>
              )}

              {activeReq.authType === 'basic' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                    <input type="text" value={activeReq.authValue} onChange={(e) => updateRequest({ authValue: e.target.value })} className="tm-input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                    <input type="password" value={activeReq.authExtra} onChange={(e) => updateRequest({ authExtra: e.target.value })} className="tm-input w-full text-sm" />
                  </div>
                </div>
              )}

              {activeReq.authType === 'api-key' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Header Name</label>
                    <input type="text" value={activeReq.authExtra || 'X-API-Key'} onChange={(e) => updateRequest({ authExtra: e.target.value })} className="tm-input w-full text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">API Key</label>
                    <input type="password" value={activeReq.authValue} onChange={(e) => updateRequest({ authValue: e.target.value })} className="tm-input w-full text-sm font-mono" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Headers */}
          {activeTab === 'headers' && (
            <div className="space-y-2">
              {activeReq.headers.map((header, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => {
                      const h = [...activeReq.headers];
                      h[i] = { ...h[i], enabled: e.target.checked };
                      updateRequest({ headers: h });
                    }}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => {
                      const h = [...activeReq.headers];
                      h[i] = { ...h[i], key: e.target.value };
                      updateRequest({ headers: h });
                    }}
                    className="tm-input flex-1 text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => {
                      const h = [...activeReq.headers];
                      h[i] = { ...h[i], value: e.target.value };
                      updateRequest({ headers: h });
                    }}
                    className="tm-input flex-1 text-xs font-mono"
                  />
                  <button onClick={() => updateRequest({ headers: activeReq.headers.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => updateRequest({ headers: [...activeReq.headers, { key: '', value: '', enabled: true }] })} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                <Plus size={12} /> Add Header
              </button>
            </div>
          )}

          {/* Body */}
          {activeTab === 'body' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Request Body (JSON)</label>
              <textarea
                rows={12}
                value={activeReq.body}
                onChange={(e) => updateRequest({ body: e.target.value })}
                placeholder='{\n  "key": "value"\n}'
                className="tm-input w-full font-mono text-xs resize-none"
                style={{ minHeight: 240 }}
              />
            </div>
          )}

          {/* Assertions */}
          {activeTab === 'assertions' && (
            <div className="space-y-3">
              {activeReq.assertions.map((assertion, i) => (
                <div key={assertion.id} className="flex items-center gap-2 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <select value={assertion.type} onChange={(e) => {
                    const a = [...activeReq.assertions];
                    a[i] = { ...a[i], type: e.target.value as AssertionType };
                    updateRequest({ assertions: a });
                  }} className="tm-input text-xs" style={{ width: 120 }}>
                    <option value="status">Status Code</option>
                    <option value="header">Header</option>
                    <option value="body">Body Contains</option>
                    <option value="json-path">JSON Path</option>
                    <option value="response-time">Response Time</option>
                  </select>

                  {(assertion.type === 'header' || assertion.type === 'json-path') && (
                    <input type="text" placeholder={assertion.type === 'header' ? 'content-type' : '$.data.id'} value={assertion.field ?? ''} onChange={(e) => {
                      const a = [...activeReq.assertions];
                      a[i] = { ...a[i], field: e.target.value };
                      updateRequest({ assertions: a });
                    }} className="tm-input text-xs flex-1 font-mono" />
                  )}

                  <select value={assertion.operator} onChange={(e) => {
                    const a = [...activeReq.assertions];
                    a[i] = { ...a[i], operator: e.target.value };
                    updateRequest({ assertions: a });
                  }} className="tm-input text-xs" style={{ width: 100 }}>
                    <option value="eq">equals</option>
                    <option value="ne">not equals</option>
                    <option value="contains">contains</option>
                    <option value="gt">greater than</option>
                    <option value="lt">less than</option>
                    <option value="exists">exists</option>
                    <option value="matches">matches regex</option>
                  </select>

                  <input type="text" placeholder="Expected value" value={assertion.expected} onChange={(e) => {
                    const a = [...activeReq.assertions];
                    a[i] = { ...a[i], expected: e.target.value };
                    updateRequest({ assertions: a });
                  }} className="tm-input text-xs flex-1" />

                  <button onClick={() => updateRequest({ assertions: activeReq.assertions.filter((_, j) => j !== i) })} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => updateRequest({ assertions: [...activeReq.assertions, { id: crypto.randomUUID(), type: 'status', operator: 'eq', expected: '200' }] })} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                <Plus size={12} /> Add Assertion
              </button>
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div className="border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <button className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/30 transition-colors" onClick={() => setShowResponse(!showResponse)}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300">Response</span>
              {result && (
                <>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.response ? statusColor(result.response.status) : 'text-red-400 bg-red-500/10'}`}>
                    {result.response?.status ?? 'ERR'}
                  </span>
                  <span className="text-xs text-slate-500">{result.response?.responseTimeMs}ms</span>
                  <span className="text-xs text-slate-500">{result.response ? `${(result.response.size / 1024).toFixed(1)} KB` : ''}</span>
                  <div className="flex gap-1">
                    {result.assertions.map((a, i) => (
                      a.passed
                        ? <CheckCircle2 key={i} size={11} className="text-emerald-400" />
                        : <XCircle key={i} size={11} className="text-red-400" />
                    ))}
                  </div>
                </>
              )}
              {running && <Loader2 size={13} className="text-indigo-400 animate-spin" />}
            </div>
            {showResponse ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronUp size={14} className="text-slate-500" />}
          </button>

          {showResponse && result && (
            <div className="px-4 pb-4 max-h-72 overflow-y-auto">
              {result.error ? (
                <div className="text-xs text-red-400 font-mono bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  {result.error}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Assertion results */}
                  {result.assertions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.assertions.map((a, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded font-medium ${a.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {a.message.slice(0, 60)}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Body */}
                  <pre className="text-xs text-slate-300 font-mono bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 overflow-auto">
                    {typeof result.response?.body === 'string'
                      ? result.response.body
                      : JSON.stringify(result.response?.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

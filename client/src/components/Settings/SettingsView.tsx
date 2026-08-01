import React, { useState } from 'react';
import {
  Settings, User, Bot, Users, Link2, Shield, Bell,
  Eye, EyeOff, Save, CheckCircle2, ChevronRight,
  Cpu, Key, Globe, Slack, Github, Trello, ExternalLink,
  AlertTriangle, Loader2, LogOut, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Section = 'profile' | 'ai-providers' | 'team' | 'integrations' | 'security' | 'audit';

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'profile',      label: 'Profile',        icon: User },
  { id: 'ai-providers', label: 'AI Providers',   icon: Cpu },
  { id: 'team',         label: 'Team & RBAC',    icon: Users },
  { id: 'integrations', label: 'Integrations',   icon: Link2 },
  { id: 'security',     label: 'Security',       icon: Shield },
  { id: 'audit',        label: 'Audit Log',      icon: Bell as React.ComponentType<any> },
];

const PROVIDER_DOCS: Record<string, { name: string; docUrl: string; envKey: string; free?: boolean }> = {
  gemini:    { name: 'Google Gemini',   docUrl: 'https://aistudio.google.com/apikey',      envKey: 'GEMINI_API_KEY',    free: true },
  anthropic: { name: 'Anthropic',       docUrl: 'https://console.anthropic.com/settings/keys', envKey: 'ANTHROPIC_API_KEY' },
  deepseek:  { name: 'DeepSeek',        docUrl: 'https://platform.deepseek.com/api_keys',  envKey: 'DEEPSEEK_API_KEY' },
  groq:      { name: 'Groq',            docUrl: 'https://console.groq.com/keys',            envKey: 'GROQ_API_KEY',     free: true },
  ollama:    { name: 'Ollama (Local)',   docUrl: 'https://ollama.com',                       envKey: 'OLLAMA_BASE_URL',  free: true },
  puter:     { name: 'Puter (Free)',     docUrl: 'https://puter.com',                        envKey: 'PUTER_AUTH_TOKEN', free: true },
};

interface ProviderInfo {
  id: string;
  label: string;
  configured: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'invited' | 'active' | 'suspended';
  invited_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  details_json?: string;
}

export default function SettingsView() {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Profile state
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // AI Providers state
  const [providers] = useState<ProviderInfo[]>([
    { id: 'gemini', label: 'Google Gemini', configured: true },
    { id: 'anthropic', label: 'Anthropic Claude', configured: false },
    { id: 'deepseek', label: 'DeepSeek', configured: false },
    { id: 'groq', label: 'Groq', configured: true },
    { id: 'ollama', label: 'Ollama (Local)', configured: false },
    { id: 'puter', label: 'Puter (Free)', configured: false },
  ]);
  const [activeProvider, setActiveProvider] = useState('gemini');

  // Team state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [teamLoaded, setTeamLoaded] = useState(false);

  // Integrations
  const [integrations, setIntegrations] = useState({ jiraUrl: '', jiraToken: '', linearToken: '', githubToken: '', slackWebhook: '' });
  const [integLoaded, setIntegLoaded] = useState(false);

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const getToken = () => localStorage.getItem('testmind_token') ?? '';
  const authHeader = { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };

  const showSuccess = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      const body: Record<string, string> = {};
      if (name) body['name'] = name;
      if (newPassword) { body['currentPassword'] = currentPassword; body['newPassword'] = newPassword; }
      const resp = await fetch('/api/settings/profile', { method: 'PUT', headers: authHeader, body: JSON.stringify(body) });
      if (!resp.ok) { showError((await resp.json() as { error: string }).error); return; }
      showSuccess();
      setCurrentPassword(''); setNewPassword('');
    } catch { showError('Failed to save profile'); }
    finally { setIsLoading(false); }
  };

  const switchProvider = async (provider: string) => {
    try {
      await fetch('/api/settings/providers', { method: 'PUT', headers: authHeader, body: JSON.stringify({ provider }) });
      setActiveProvider(provider);
      showSuccess();
    } catch { showError('Failed to switch provider'); }
  };

  const loadTeam = async () => {
    if (teamLoaded) return;
    try {
      const resp = await fetch('/api/settings/team', { headers: authHeader });
      const data = await resp.json() as { members: TeamMember[] };
      setMembers(data.members ?? []);
      setTeamLoaded(true);
    } catch {}
  };

  const inviteMember = async () => {
    if (!inviteEmail.includes('@')) { showError('Valid email required'); return; }
    setIsInviting(true);
    try {
      const resp = await fetch('/api/settings/team/invite', { method: 'POST', headers: authHeader, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      const data = await resp.json() as { id: string; message: string };
      if (data.id) {
        setMembers((prev) => [...prev, { id: data.id, email: inviteEmail, role: inviteRole, status: 'invited', invited_at: new Date().toISOString() }]);
        setInviteEmail('');
        showSuccess();
      }
    } catch { showError('Failed to invite member'); }
    finally { setIsInviting(false); }
  };

  const removeMember = async (id: string) => {
    try {
      await fetch(`/api/settings/team/${id}`, { method: 'DELETE', headers: authHeader });
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch { showError('Failed to remove member'); }
  };

  const loadIntegrations = async () => {
    if (integLoaded) return;
    try {
      const resp = await fetch('/api/settings/integrations', { headers: authHeader });
      const data = await resp.json() as { integrations: typeof integrations };
      setIntegrations({ ...integrations, ...data.integrations });
      setIntegLoaded(true);
    } catch {}
  };

  const saveIntegrations = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/settings/integrations', { method: 'PUT', headers: authHeader, body: JSON.stringify(integrations) });
      showSuccess();
    } catch { showError('Failed to save integrations'); }
    finally { setIsLoading(false); }
  };

  const loadAudit = async () => {
    if (auditLoaded) return;
    try {
      const resp = await fetch('/api/settings/audit?limit=30', { headers: authHeader });
      const data = await resp.json() as { logs: AuditEntry[] };
      setAuditLogs(data.logs ?? []);
      setAuditLoaded(true);
    } catch {}
  };

  const handleSectionChange = (section: Section) => {
    setActiveSection(section);
    if (section === 'team') loadTeam();
    if (section === 'integrations') loadIntegrations();
    if (section === 'audit') loadAudit();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-52 border-r shrink-0 p-3 space-y-1" style={{ borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)' }}>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-3">Settings</p>
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSectionChange(s.id)}
              className={`sidebar-nav-item w-full text-left ${isActive ? 'active' : ''}`}
            >
              <Icon size={15} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="text-xs">{s.label}</span>
              {isActive && <ChevronRight size={12} className="ml-auto text-indigo-400" />}
            </button>
          );
        })}

        <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
          <button onClick={logout} className="sidebar-nav-item w-full text-left group">
            <LogOut size={15} className="text-slate-500 group-hover:text-red-400" />
            <span className="text-xs group-hover:text-red-400">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Status messages */}
        {saved && (
          <div className="fixed top-4 right-4 flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
            <CheckCircle2 size={16} />Saved successfully
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 text-sm px-4 py-2.5 rounded-xl shadow-lg z-50">
            <AlertTriangle size={16} />{error}
          </div>
        )}

        <div className="max-w-2xl space-y-8">
          {/* ── Profile ──────────────────────────────────────────────── */}
          {activeSection === 'profile' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Profile</h2>
                <p className="text-sm text-slate-400 mt-0.5">Update your name, email, and password</p>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-4 pb-5 border-b border-slate-700/50">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white">
                    U
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Your Account</p>
                    <p className="text-xs text-slate-400">Free Plan</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Display Name</label>
                  <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="tm-input w-full text-sm" />
                </div>

                <div className="pt-4 border-t border-slate-700/50 space-y-4">
                  <p className="text-xs font-semibold text-slate-300">Change Password</p>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <input type={showPwd ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="tm-input w-full text-sm pr-10" placeholder="Current password" />
                      <button onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="tm-input w-full text-sm" placeholder="New password (min 8 chars)" />
                  </div>
                </div>

                <button onClick={saveProfile} disabled={isLoading} className="btn-primary flex items-center gap-2">
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Profile
                </button>
              </div>
            </>
          )}

          {/* ── AI Providers ──────────────────────────────────────────── */}
          {activeSection === 'ai-providers' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">AI Providers</h2>
                <p className="text-sm text-slate-400 mt-0.5">Choose which AI provider powers TestMind AI</p>
              </div>

              <div className="space-y-3">
                {providers.map((p) => {
                  const doc = PROVIDER_DOCS[p.id];
                  const isActive = activeProvider === p.id;
                  return (
                    <div key={p.id} className={`bg-slate-800/40 border rounded-2xl p-4 transition-all ${isActive ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-slate-700/50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${isActive ? 'bg-indigo-500/20' : 'bg-slate-700/60'} flex items-center justify-center`}>
                            <Cpu size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white">{doc?.name ?? p.label}</p>
                              {doc?.free && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">FREE</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-medium ${p.configured ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {p.configured ? '● Configured' : '○ Not configured'}
                              </span>
                              {isActive && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-semibold">ACTIVE</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {doc && (
                            <a href={doc.docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors">
                              <Key size={12} />Get Key
                              <ExternalLink size={10} />
                            </a>
                          )}
                          <button
                            onClick={() => switchProvider(p.id)}
                            disabled={isActive}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isActive
                                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400 cursor-default'
                                : 'border-slate-700/50 text-slate-400 hover:border-indigo-500/40 hover:text-indigo-400'
                            }`}
                          >
                            {isActive ? '✓ Active' : 'Switch'}
                          </button>
                        </div>
                      </div>

                      {doc && (
                        <div className="mt-3 pt-3 border-t border-slate-700/40">
                          <p className="text-[11px] text-slate-500">
                            Set <code className="font-mono text-slate-400 bg-slate-700/40 px-1 py-0.5 rounded">{doc.envKey}</code> in your <code className="font-mono text-slate-400 bg-slate-700/40 px-1 py-0.5 rounded">.env</code> file to configure this provider.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Team ─────────────────────────────────────────────────── */}
          {activeSection === 'team' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Team & RBAC</h2>
                <p className="text-sm text-slate-400 mt-0.5">Invite team members and assign roles</p>
              </div>

              {/* Invite */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                <p className="text-xs font-semibold text-slate-300 mb-4">Invite Team Member</p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="tm-input flex-1 text-sm"
                  />
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)} className="tm-input text-sm" style={{ width: 110 }}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={inviteMember} disabled={isInviting} className="btn-primary flex items-center gap-2 px-4">
                    {isInviting ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                    Invite
                  </button>
                </div>
              </div>

              {/* Role guide */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { role: 'Viewer', desc: 'Read-only access to tests and reports', color: 'border-slate-700/50' },
                  { role: 'Editor', desc: 'Can create, run, and edit tests', color: 'border-amber-500/30' },
                  { role: 'Admin', desc: 'Full access including team and settings', color: 'border-red-500/30' },
                ].map((r) => (
                  <div key={r.role} className={`bg-slate-800/40 border ${r.color} rounded-xl p-3`}>
                    <p className="font-semibold text-white mb-1">{r.role}</p>
                    <p className="text-slate-400 text-[11px]">{r.desc}</p>
                  </div>
                ))}
              </div>

              {/* Members list */}
              {members.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-700/50 rounded-2xl">
                  No team members yet. Invite someone above.
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3.5 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{m.email}</p>
                        <p className="text-[11px] text-slate-500">{m.status === 'invited' ? 'Invitation pending' : 'Active member'}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        m.role === 'admin' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        m.role === 'editor' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                        'bg-slate-700/40 border-slate-600/40 text-slate-400'
                      } capitalize`}>{m.role}</span>
                      <button onClick={() => removeMember(m.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Integrations ─────────────────────────────────────────── */}
          {activeSection === 'integrations' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Integrations</h2>
                <p className="text-sm text-slate-400 mt-0.5">Connect TestMind AI to your project management and notification tools</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'jiraUrl', label: 'Jira URL', icon: Globe, placeholder: 'https://your-org.atlassian.net', type: 'text' },
                  { key: 'jiraToken', label: 'Jira API Token', icon: Key, placeholder: 'Jira API token', type: 'password' },
                  { key: 'linearToken', label: 'Linear API Key', icon: Key, placeholder: 'lin_api_...', type: 'password' },
                  { key: 'githubToken', label: 'GitHub Token', icon: Github, placeholder: 'ghp_...', type: 'password' },
                  { key: 'slackWebhook', label: 'Slack Webhook URL', icon: Slack, placeholder: 'https://hooks.slack.com/services/...', type: 'text' },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                      <label className="block text-[11px] font-medium text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                        <Icon size={11} />{field.label}
                      </label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={(integrations as Record<string, string>)[field.key] ?? ''}
                        onChange={(e) => setIntegrations((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="tm-input w-full text-sm font-mono"
                      />
                    </div>
                  );
                })}
              </div>

              <button onClick={saveIntegrations} disabled={isLoading} className="btn-primary flex items-center gap-2">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Integrations
              </button>
            </>
          )}

          {/* ── Security ─────────────────────────────────────────────── */}
          {activeSection === 'security' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Security</h2>
                <p className="text-sm text-slate-400 mt-0.5">Manage sessions and security settings</p>
              </div>

              <div className="space-y-4">
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={15} className="text-amber-400" />
                    <p className="text-sm font-semibold text-amber-400">JWT Authentication</p>
                  </div>
                  <p className="text-xs text-slate-400">Sessions expire after 7 days. Change the <code className="font-mono text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">JWT_SECRET</code> in your <code className="font-mono text-slate-400 bg-slate-700/40 px-1 py-0.5 rounded">.env</code> file to invalidate all current sessions.</p>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-3">
                  <p className="text-xs font-semibold text-slate-300">Active Sessions</p>
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-700/50">
                    <div>
                      <p className="text-sm text-white">Current Session</p>
                      <p className="text-xs text-slate-500">This device • Active now</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">CURRENT</span>
                  </div>
                  <button onClick={logout} className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                    <LogOut size={13} />Sign out of all sessions
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Audit Log ─────────────────────────────────────────────── */}
          {activeSection === 'audit' && (
            <>
              <div>
                <h2 className="text-lg font-bold text-white">Audit Log</h2>
                <p className="text-sm text-slate-400 mt-0.5">Track all account activity</p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-700/50 rounded-2xl">
                  No audit entries yet. Actions like logins and settings changes are recorded here.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-white font-medium">{log.action.replace(/_/g, ' ')}</p>
                        {log.details_json && (
                          <p className="text-[11px] text-slate-500 font-mono">{log.details_json}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

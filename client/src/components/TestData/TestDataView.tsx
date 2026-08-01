import React, { useState } from 'react';
import {
  Database, Shuffle, Download, Copy, Loader2,
  User, MapPin, Building2, CreditCard, Package,
  ShoppingCart, FileText, ArrowRight, Shield, Wand2,
  Globe, Phone, Table, Code2, FileCode2
} from 'lucide-react';

type DataType = 'user' | 'address' | 'company' | 'creditCard' | 'bankAccount' |
  'product' | 'order' | 'invoice' | 'transaction' | 'ticket' | 'email' | 'phone';
type Locale = 'en_US' | 'en_GB' | 'fr_FR' | 'de_DE' | 'es_ES' | 'ja_JP' | 'zh_CN' | 'ar_SA' | 'pt_BR';
type OutputFormat = 'json' | 'csv' | 'sql' | 'typescript';

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<any>; color: string; border: string }> = {
  user:        { label: 'User / Person',    icon: User,         color: 'from-indigo-500/20 to-violet-500/20',  border: 'border-indigo-500/30' },
  address:     { label: 'Address',          icon: MapPin,       color: 'from-emerald-500/20 to-teal-500/20',   border: 'border-emerald-500/30' },
  company:     { label: 'Company',          icon: Building2,    color: 'from-sky-500/20 to-cyan-500/20',       border: 'border-sky-500/30' },
  creditCard:  { label: 'Credit Card',      icon: CreditCard,   color: 'from-pink-500/20 to-rose-500/20',     border: 'border-pink-500/30' },
  bankAccount: { label: 'Bank Account',     icon: Database,     color: 'from-amber-500/20 to-yellow-500/20',  border: 'border-amber-500/30' },
  product:     { label: 'Product',          icon: Package,      color: 'from-orange-500/20 to-red-500/20',    border: 'border-orange-500/30' },
  order:       { label: 'Order',            icon: ShoppingCart, color: 'from-lime-500/20 to-green-500/20',    border: 'border-lime-500/30' },
  invoice:     { label: 'Invoice',          icon: FileText,     color: 'from-teal-500/20 to-emerald-500/20',  border: 'border-teal-500/30' },
  transaction: { label: 'Transaction',      icon: ArrowRight,   color: 'from-violet-500/20 to-purple-500/20', border: 'border-violet-500/30' },
  ticket:      { label: 'Support Ticket',   icon: FileCode2,    color: 'from-red-500/20 to-orange-500/20',    border: 'border-red-500/30' },
  email:       { label: 'Email Address',    icon: Globe,        color: 'from-cyan-500/20 to-sky-500/20',      border: 'border-cyan-500/30' },
  phone:       { label: 'Phone Number',     icon: Phone,        color: 'from-slate-500/20 to-zinc-500/20',    border: 'border-slate-500/30' },
};

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'en_US', label: '🇺🇸 English (US)' },
  { value: 'en_GB', label: '🇬🇧 English (UK)' },
  { value: 'fr_FR', label: '🇫🇷 French' },
  { value: 'de_DE', label: '🇩🇪 German' },
  { value: 'es_ES', label: '🇪🇸 Spanish' },
  { value: 'ja_JP', label: '🇯🇵 Japanese' },
  { value: 'zh_CN', label: '🇨🇳 Chinese' },
  { value: 'ar_SA', label: '🇸🇦 Arabic' },
  { value: 'pt_BR', label: '🇧🇷 Portuguese' },
];

const FORMAT_ICONS: Record<OutputFormat, React.ComponentType<any>> = {
  json: Code2,
  csv: Table,
  sql: Database,
  typescript: FileCode2,
};

interface Dataset {
  id: string;
  type: DataType;
  count: number;
  locale: Locale;
  format: OutputFormat;
  data: Record<string, unknown>[];
  output: string;
  createdAt: string;
}

export default function TestDataView() {
  const [selectedType, setSelectedType] = useState<DataType>('user');
  const [count, setCount] = useState(10);
  const [locale, setLocale] = useState<Locale>('en_US');
  const [format, setFormat] = useState<OutputFormat>('json');
  const [masked, setMasked] = useState(false);
  const [tableName, setTableName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Dataset[]>([]);

  const getToken = () => localStorage.getItem('testmind_token') ?? '';

  const generate = async () => {
    setIsGenerating(true);
    setDataset(null);
    try {
      const resp = await fetch('/api/test-data/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ type: selectedType, count, locale, format, tableName: tableName || selectedType, masked }),
      });
      const data = await resp.json() as { dataset: Dataset };
      if (data.dataset) {
        setDataset(data.dataset);
        setHistory((prev) => [data.dataset, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyOutput = () => {
    if (!dataset) return;
    navigator.clipboard.writeText(dataset.output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadOutput = () => {
    if (!dataset) return;
    const ext = { json: 'json', csv: 'csv', sql: 'sql', typescript: 'ts' }[dataset.format];
    const blob = new Blob([dataset.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testdata-${dataset.type}-${dataset.count}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const meta = TYPE_META[selectedType];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database size={22} className="text-emerald-400" />
            Test Data Factory
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">Generate realistic synthetic data for automated tests — 12 types, 9 locales, 4 formats</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Config Panel */}
        <div className="col-span-4 space-y-5">
          {/* Data Type Grid */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Data Type</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(TYPE_META).map(([type, m]) => {
                const Icon = m.icon;
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type as DataType)}
                    className={`p-2.5 rounded-xl border text-center transition-all duration-200 ${
                      isSelected
                        ? `bg-gradient-to-br ${m.color} ${m.border} scale-[1.03]`
                        : 'border-slate-700/50 hover:border-slate-600/60 hover:bg-slate-700/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Icon size={16} className={isSelected ? 'text-white mx-auto mb-1' : 'text-slate-400 mx-auto mb-1'} />
                    <p className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-white' : 'text-slate-400'}`}>{m.label.split(' ')[0]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Generation Options</p>

            {/* Count */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Count: <span className="text-white font-bold">{count.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min={1}
                max={1000}
                step={1}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1.5"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>1</span>
                <span>250</span>
                <span>500</span>
                <span>1,000</span>
              </div>
              <input
                type="number"
                min={1}
                max={10000}
                value={count}
                onChange={(e) => setCount(Math.min(10000, Math.max(1, parseInt(e.target.value) || 1)))}
                className="tm-input w-full text-sm mt-2"
                placeholder="Or type exact count (max 10,000)"
              />
            </div>

            {/* Locale */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Locale</label>
              <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="tm-input w-full text-sm">
                {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Output Format</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['json', 'csv', 'sql', 'typescript'] as OutputFormat[]).map((f) => {
                  const FmtIcon = FORMAT_ICONS[f];
                  return (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-semibold transition-all ${
                        format === f
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                          : 'border-slate-700/50 text-slate-500 hover:border-slate-600/60 hover:text-slate-300'
                      }`}
                    >
                      <FmtIcon size={13} />
                      {f.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table name (for SQL) */}
            {format === 'sql' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Table Name</label>
                <input
                  type="text"
                  placeholder={selectedType}
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="tm-input w-full text-sm font-mono"
                />
              </div>
            )}

            {/* PII Masking */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setMasked(!masked)}
                className={`w-10 h-5 rounded-full relative transition-colors ${masked ? 'bg-indigo-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${masked ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="text-xs text-slate-300 group-hover:text-white transition-colors flex items-center gap-1.5">
                <Shield size={12} className="text-slate-500" />
                Apply PII Masking
              </span>
            </label>
          </div>

          <button
            onClick={generate}
            disabled={isGenerating}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
          >
            {isGenerating
              ? <><Loader2 size={16} className="animate-spin" />Generating {count.toLocaleString()} {meta.label}s…</>
              : <><Wand2 size={16} />Generate {count.toLocaleString()} {meta.label}s</>
            }
          </button>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Recent</p>
              <div className="space-y-1.5">
                {history.map((h) => {
                  const hm = TYPE_META[h.type];
                  const HIcon = hm.icon;
                  return (
                    <button key={h.id} onClick={() => setDataset(h)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-700/40 transition-colors text-left">
                      <HIcon size={13} className="text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-300 flex-1 truncate">{h.count} {hm.label}s</span>
                      <span className="text-[10px] text-slate-500 uppercase">{h.format}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div className="col-span-8">
          {!dataset && !isGenerating && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${meta.color} border ${meta.border} flex items-center justify-center mx-auto`}>
                  {React.createElement(meta.icon, { size: 28, className: 'text-white' })}
                </div>
                <div>
                  <p className="text-white font-semibold">Ready to Generate</p>
                  <p className="text-slate-400 text-sm mt-1">Configure options and click Generate</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Luhn-valid credit cards', 'IBAN bank accounts', 'Realistic emails', 'GPS coordinates', 'SQL INSERT statements'].map((f) => (
                    <span key={f} className="text-xs bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-slate-400">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 size={32} className="animate-spin text-indigo-400 mx-auto" />
                <p className="text-slate-300 text-sm">Generating {count.toLocaleString()} {meta.label.toLowerCase()} records…</p>
                <p className="text-slate-500 text-xs">Locale: {locale} • Format: {format.toUpperCase()}{masked ? ' • PII Masked' : ''}</p>
              </div>
            </div>
          )}

          {dataset && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden h-full flex flex-col">
              {/* Output header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  {React.createElement(meta.icon, { size: 16, className: 'text-emerald-400' })}
                  <span className="text-sm font-semibold text-white">{dataset.count.toLocaleString()} {meta.label}s generated</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold uppercase">{dataset.format}</span>
                  <span className="text-[10px] text-slate-500">{locale}</span>
                  {dataset.data.length > 0 && <span className="text-[10px] text-slate-500">{Object.keys(dataset.data[0]).length} fields</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyOutput}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      copied ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <Copy size={12} />{copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={downloadOutput} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
                    <Download size={12} />Download
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700/50">
                {(['preview', 'raw'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveOutputTab(tab)} className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${activeOutputTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    {tab === 'preview' ? 'Preview Table' : 'Raw Output'}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {activeOutputTab === 'preview' && dataset.data.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900/60 sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-8">#</th>
                          {Object.keys(dataset.data[0]).slice(0, 8).map((key) => (
                            <th key={key} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{key}</th>
                          ))}
                          {Object.keys(dataset.data[0]).length > 8 && (
                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">+{Object.keys(dataset.data[0]).length - 8} more</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.data.slice(0, 50).map((row, i) => (
                          <tr key={i} className={`border-t border-slate-800/50 ${i % 2 === 0 ? '' : 'bg-slate-900/20'} hover:bg-slate-700/20 transition-colors`}>
                            <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                            {Object.values(row).slice(0, 8).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-slate-300 max-w-[180px]">
                                <span className="truncate block">{String(val ?? '').slice(0, 40)}{String(val ?? '').length > 40 ? '…' : ''}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {dataset.data.length > 50 && (
                      <div className="text-center py-3 text-xs text-slate-500 border-t border-slate-800/50">
                        Showing 50 of {dataset.count.toLocaleString()} records — download to see all
                      </div>
                    )}
                  </div>
                )}

                {activeOutputTab === 'raw' && (
                  <pre className="p-4 text-xs text-slate-300 font-mono overflow-auto leading-relaxed" style={{ maxHeight: 480 }}>
                    {dataset.output.slice(0, 50000)}{dataset.output.length > 50000 ? '\n\n... (truncated, download to see full output)' : ''}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { TestCase, TestReport } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  testCases: TestCase[];
  report?: TestReport;
}

const PRIORITY_COLOR: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#3b82f6',
};

const TYPE_COLOR: Record<string, string> = {
  'E2E': '#5eead4',
  'API': '#818cf8',
  'Unit': '#34d399',
  'Mobile': '#fb923c',
  'Performance': '#f472b6',
  'Security': '#e11d48',
  'Accessibility': '#a78bfa',
};

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export default function CoverageHeatmap({ testCases, report }: Props) {
  const byType = groupBy(testCases, tc => tc.type || 'Unknown');
  const byPriority = groupBy(testCases, tc => tc.priority || 'Medium');

  const typeData = Object.entries(byType).map(([name, cases]) => ({
    name,
    count: cases.length,
    passed: report ? Math.round(cases.length * (report.passed / Math.max(report.totalTests, 1))) : 0,
    failed: report ? Math.round(cases.length * (report.failed / Math.max(report.totalTests, 1))) : 0,
  }));

  const priorityData = Object.entries(byPriority).map(([name, cases]) => ({
    name,
    count: cases.length,
  })).sort((a, b) => {
    const order = ['High', 'Medium', 'Low'];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  // Tag cloud
  const tagCounts: Record<string, number> = {};
  testCases.forEach(tc => {
    (tc.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);
  const maxTagCount = topTags[0]?.[1] || 1;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-xs">
          <p className="font-semibold text-slate-200 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      <div>
        <h5 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wide">Coverage by Test Type</h5>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tests" radius={[4, 4, 0, 0]}>
                {typeData.map((entry) => (
                  <Cell key={entry.name} fill={TYPE_COLOR[entry.name] || '#5eead4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wide">Coverage by Priority</h5>
        <div className="space-y-2">
          {priorityData.map(({ name, count }) => {
            const pct = Math.round((count / testCases.length) * 100);
            return (
              <div key={name}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{name}</span>
                  <span>{count} tests ({pct}%)</span>
                </div>
                <div className="h-2 bg-surface-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: PRIORITY_COLOR[name] || '#94a3b8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {topTags.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wide">Tag Cloud</h5>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => {
              const weight = count / maxTagCount;
              const size = weight > 0.7 ? 'text-sm' : weight > 0.4 ? 'text-xs' : 'text-[10px]';
              const opacity = 0.4 + weight * 0.6;
              return (
                <span
                  key={tag}
                  className={`px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20 text-accent-green font-mono ${size}`}
                  style={{ opacity }}
                >
                  #{tag}
                  {count > 1 && <sup className="ml-0.5 text-[8px] text-accent-green/60">{count}</sup>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {testCases.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-8">No test cases yet — generate some to see coverage analysis.</p>
      )}
    </div>
  );
}

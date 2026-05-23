import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TestReport } from '../../types';

interface Props {
  report: TestReport;
}

const COLORS = ['#5eead4', '#ef4444', '#64748b'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-800 border border-surface-600 rounded px-2 py-1 text-xs">
        <span style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value}</span>
      </div>
    );
  }
  return null;
};

export default function SummaryChart({ report }: Props) {
  const pieData = [
    { name: 'Passed', value: report.passed },
    { name: 'Failed', value: report.failed },
    { name: 'Skipped', value: report.skipped },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Passed', value: report.passed, fill: '#5eead4' },
    { name: 'Failed', value: report.failed, fill: '#ef4444' },
    { name: 'Skipped', value: report.skipped, fill: '#64748b' },
  ].filter(d => d.value > 0);

  return (
    <div className="flex gap-3 items-center mb-4">
      {/* Donut */}
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={48}
              paddingAngle={2} dataKey="value">
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-accent-green">
          {report.passRate}
        </span>
      </div>
      {/* Bar chart */}
      <div className="flex-1 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

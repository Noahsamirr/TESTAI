import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { TestReport } from '../../types';

interface Props {
  report: TestReport;
}

const COLORS = ['#5eead4', '#f87171', '#64748b'];

export default function SummaryChart({ report }: Props) {
  const data = [
    { name: 'Passed', value: report.passed },
    { name: 'Failed', value: report.failed },
    { name: 'Skipped', value: report.skipped },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0f1812', border: '1px solid #1d2e1e', borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-2xl font-bold text-accent-green mt-1">{report.passRate}</p>
    </div>
  );
}

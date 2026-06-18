import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/format';

interface ShiftAnalysisChartProps {
  data: Array<{
    shift: string;
    sales: number;
    color: string;
  }>;
  height?: number;
}

const CustomTick = ({ x, y, payload }: any) => {
  const [name, hours] = payload.value.split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="var(--text-muted)" fontSize={13} fontWeight="bold">{name}</text>
      {hours && <text x={0} y={0} dy={36} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{hours}</text>}
    </g>
  );
};

export function ShiftAnalysisChart({ data, height = 300 }: ShiftAnalysisChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        لا توجد بيانات كافية للرسم البياني
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 20, // increased bottom margin to fit the second line
          }}
          barSize={40}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, #e2e8f0)" />
          <XAxis 
            dataKey="shift" 
            axisLine={false} 
            tickLine={false} 
            tick={<CustomTick />}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted, #64748b)', fontSize: 12 }}
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            dx={-10}
            width={60}
          />
          <Tooltip 
            formatter={(value: any) => [formatCurrency(value), 'المبيعات']}
            labelFormatter={(label) => label.replace('|', ' ')}
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ color: 'var(--text-muted, #64748b)', fontWeight: 'bold', marginBottom: 4 }}
          />
          <Bar dataKey="sales" radius={[6, 6, 0, 0]} animationDuration={1500}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

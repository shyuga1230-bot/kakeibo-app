'use client';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { formatCurrency } from '@/utils/currency';

interface ChartData {
  name: string;
  value: number;
  color: string;
  fill: string;
}

interface CategoryPieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

const RADIAN = Math.PI / 180;

function renderLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if ((percent as number) < 0.05) return null;
  const radius = (innerRadius as number) + ((outerRadius as number) - (innerRadius as number)) * 0.5;
  const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: 11, fontWeight: 700 }}>
      {`${((percent as number) * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChartData }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.payload.color }} />
        <span className="text-sm font-medium text-gray-800">{d.name}</span>
      </div>
      <p className="text-sm font-bold text-gray-900 mt-0.5">{formatCurrency(d.value)}</p>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2 px-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <p className="text-5xl mb-3">📊</p>
        <p className="text-sm">まだ支出がありません</p>
      </div>
    );
  }

  // Recharts 3.x uses `fill` on data items instead of Cell
  const chartData: ChartData[] = data.map((d) => ({ ...d, fill: d.color }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          outerRadius={90}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

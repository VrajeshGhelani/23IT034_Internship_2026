import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const date = new Date(data.date);
    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold text-slate-100">{fullDate}</p>
        <p className="text-xs text-slate-400">
          Spent: {formatCurrency(data.total)}
        </p>
      </div>
    );
  }
  return null;
};

const DailyActivityChart = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-4xl mb-3">📆</div>
        <p className="text-sm text-slate-500">No daily activity data available</p>
      </div>
    );
  }

  // Format X axis labels: show only Mon/Wed/Fri
  const formatXAxis = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    // 1=Mon, 3=Wed, 5=Fri
    if (day === 1 || day === 3 || day === 5) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  };

  return (
    <div className="glass-card p-6" id="daily-activity-chart">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-lg">📆</span>
        Daily Spending (Last 30 Days)
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="total"
              radius={[3, 3, 0, 0]}
              barSize={8}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={hoveredIndex === index ? '#f97316' : '#3b82f6'}
                  style={{ transition: 'fill 0.2s' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyActivityChart;

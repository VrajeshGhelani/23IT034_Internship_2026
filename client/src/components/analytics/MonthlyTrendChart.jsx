import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold text-slate-100">{data.month}</p>
        <p className="text-xs text-slate-400">
          Total: {formatCurrency(data.total)}
        </p>
        <p className="text-xs text-slate-500">
          {data.count} expense{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[350px]">
        <div className="text-4xl mb-3">📈</div>
        <p className="text-sm text-slate-500">No monthly data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6" id="monthly-trend-chart">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-lg">📈</span>
        Monthly Spending Trend (Last 6 Months)
      </h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorTotal)"
              dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
              activeDot={{ fill: '#60a5fa', r: 6, strokeWidth: 2, stroke: '#1e3a5f' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyTrendChart;

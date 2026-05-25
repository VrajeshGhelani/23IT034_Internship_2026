import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const CATEGORY_COLORS = {
  Food: '#FF6384',
  Travel: '#36A2EB',
  Rent: '#FFCE56',
  Entertainment: '#4BC0C0',
  Utilities: '#9966FF',
  Other: '#FF9F40',
};

const FALLBACK_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold text-slate-100">{data.category}</p>
        <p className="text-xs text-slate-400">
          {formatCurrency(data.total)} · {data.percentage}%
        </p>
        <p className="text-xs text-slate-500">{data.count} expense{data.count !== 1 ? 's' : ''}</p>
      </div>
    );
  }
  return null;
};

const CategoryPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[350px]">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm text-slate-500">No category data available</p>
      </div>
    );
  }

  const chartData = data.map((item, i) => ({
    ...item,
    fill: CATEGORY_COLORS[item.category] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  return (
    <div className="glass-card p-6" id="category-pie-chart">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-lg">🍩</span>
        By Category
      </h3>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="total"
              nameKey="category"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-slate-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category list below chart */}
      <div className="mt-4 space-y-2">
        {chartData.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm text-slate-300">{item.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-200">
                {formatCurrency(item.total)}
              </span>
              <span className="text-xs text-slate-500 w-12 text-right">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPieChart;

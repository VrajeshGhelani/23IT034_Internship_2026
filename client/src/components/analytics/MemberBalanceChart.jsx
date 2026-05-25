import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const paid = payload.find((p) => p.dataKey === 'paid')?.value || 0;
    const owes = payload.find((p) => p.dataKey === 'owes')?.value || 0;
    const net = paid - owes;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl">
        <p className="text-sm font-semibold text-slate-100">{label}</p>
        <p className="text-xs text-emerald-400">Paid: {formatCurrency(paid)}</p>
        <p className="text-xs text-red-400">Owes: {formatCurrency(owes)}</p>
        <p
          className={`text-xs font-medium mt-1 ${
            net >= 0 ? 'text-emerald-300' : 'text-red-300'
          }`}
        >
          Net: {net >= 0 ? '+' : ''}{formatCurrency(net)}
        </p>
      </div>
    );
  }
  return null;
};

const MemberBalanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-sm text-slate-500">No member data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6" id="member-balance-chart">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-lg">👥</span>
        Member Spending Overview
      </h3>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="name"
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
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-400 capitalize">{value}</span>
              )}
            />
            <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
            <Bar dataKey="owes" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MemberBalanceChart;

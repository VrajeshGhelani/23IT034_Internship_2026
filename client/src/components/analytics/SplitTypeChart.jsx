const SPLIT_COLORS = {
  equal: '#3b82f6',
  exact: '#10b981',
  percentage: '#f59e0b',
  shares: '#8b5cf6',
};

const SPLIT_LABELS = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: 'Percentage',
  shares: 'Shares',
};

const SplitTypeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-4xl mb-3">🔀</div>
        <p className="text-sm text-slate-500">No split type data available</p>
      </div>
    );
  }

  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="glass-card p-6" id="split-type-chart">
      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-lg">🔀</span>
        Split Methods Used
      </h3>

      <div className="space-y-4">
        {data.map((item, i) => {
          const percentage = totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0;
          const color = SPLIT_COLORS[item.type] || '#64748b';
          const label = SPLIT_LABELS[item.type] || item.type;

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-slate-300">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{item.count}</span>
                  <span className="text-xs text-slate-500">({percentage}%)</span>
                </div>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                    minWidth: percentage > 0 ? '8px' : '0',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">Total splits</span>
        <span className="text-sm font-semibold text-slate-300">{totalCount}</span>
      </div>
    </div>
  );
};

export default SplitTypeChart;

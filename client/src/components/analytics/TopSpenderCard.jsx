import { formatCurrency } from '../../utils/formatCurrency';

const TopSpenderCard = ({ topSpender, totalAmount }) => {
  if (!topSpender || topSpender.name === 'N/A') {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[180px]">
        <div className="text-4xl mb-3">👑</div>
        <p className="text-sm text-slate-500">No spending data yet</p>
      </div>
    );
  }

  const percentage =
    totalAmount > 0
      ? Math.round((topSpender.amount / totalAmount) * 100)
      : 0;

  // Generate a gradient initial
  const initial = topSpender.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="glass-card p-6 relative overflow-hidden group"
      id="top-spender-card"
    >
      {/* Decorative background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl group-hover:from-amber-500/20 group-hover:to-orange-500/20 transition-all duration-500" />

      <div className="relative">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <span className="text-lg">👑</span>
          Top Spender
        </h3>

        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-amber-900/30 flex-shrink-0">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-slate-100 truncate">
                {topSpender.name}
              </p>
              <span className="text-lg" title="Top spender">👑</span>
            </div>
            <p className="text-xl font-bold text-amber-400 mt-0.5">
              {formatCurrency(topSpender.amount)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {percentage}% of group total
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopSpenderCard;

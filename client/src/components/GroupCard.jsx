import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/formatCurrency';

const SPLIT_COLORS = {
  positive: 'text-success-400',
  negative: 'text-danger-400',
  zero: 'text-slate-400',
};

const GroupCard = ({ group, myBalance }) => {
  const balanceColor =
    myBalance > 0 ? SPLIT_COLORS.positive : myBalance < 0 ? SPLIT_COLORS.negative : SPLIT_COLORS.zero;

  const balanceLabel =
    myBalance > 0
      ? `You are owed ${formatCurrency(myBalance)}`
      : myBalance < 0
      ? `You owe ${formatCurrency(Math.abs(myBalance))}`
      : 'All settled up';

  const memberCount = group.members?.length || 0;

  return (
    <Link
      to={`/groups/${group._id}`}
      className="glass-card p-5 hover:border-primary-500/30 hover:shadow-lg hover:shadow-primary-900/20 transition-all duration-300 group animate-fade-in block"
      id={`group-card-${group._id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Group icon + name */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/40 to-accent-600/40 border border-primary-500/20 flex items-center justify-center text-lg flex-shrink-0">
              👥
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 group-hover:text-primary-400 transition-colors truncate">
                {group.name}
              </h3>
              {group.description && (
                <p className="text-xs text-slate-500 truncate">{group.description}</p>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex -space-x-1.5">
              {(group.members || []).slice(0, 4).map((member, i) => (
                <div
                  key={member._id || i}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold text-white"
                  title={member.name}
                >
                  {(member.name || '?')[0].toUpperCase()}
                </div>
              ))}
              {memberCount > 4 && (
                <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[9px] text-slate-400">
                  +{memberCount - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {memberCount} member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Balance */}
        <div className="flex-shrink-0 text-right">
          <p className={`text-sm font-semibold ${balanceColor}`}>{balanceLabel}</p>
          {myBalance !== 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {myBalance > 0 ? '↑ incoming' : '↓ outgoing'}
            </p>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-end mt-1">
        <svg
          className="w-4 h-4 text-slate-600 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};

export default GroupCard;

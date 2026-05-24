import { useEffect, useState } from 'react';
import { fetchExpenses } from '../api/expenseApi';
import { fetchSettleUp } from '../api/balanceApi';
import { formatRelativeTime, formatCurrency, CATEGORY_ICONS } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';

const ActivityFeed = ({ groupId }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [expRes] = await Promise.all([fetchExpenses(groupId)]);
        const expenses = expRes.data.expenses || [];

        // Map expenses to activity items
        const expenseItems = expenses.map((e) => ({
          id: e._id,
          type: 'expense',
          title: e.title,
          amount: e.amount,
          actor: e.createdBy,
          category: e.category,
          date: e.createdAt || e.date,
          icon: CATEGORY_ICONS[e.category] || '💰',
        }));

        // Sort by date descending
        const sorted = [...expenseItems].sort((a, b) => new Date(b.date) - new Date(a.date));
        setItems(sorted);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-2 bg-slate-800/60 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-1">No activity yet</h3>
        <p className="text-sm text-slate-500">Add expenses to see activity here.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-5 bottom-5 w-px bg-gradient-to-b from-primary-500/30 via-slate-700/50 to-transparent" />

      <div className="space-y-4">
        {items.map((item, i) => {
          const isMe = item.actor?._id === user?._id;

          return (
            <div key={item.id || i} className="flex gap-4 pl-2 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base z-10 relative">
                  {item.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 glass-card p-3.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200">
                      <span className="font-semibold text-primary-400">
                        {isMe ? 'You' : item.actor?.name || 'Someone'}
                      </span>{' '}
                      added{' '}
                      <span className="font-semibold text-slate-100">"{item.title}"</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatRelativeTime(item.date)}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-200 flex-shrink-0">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;

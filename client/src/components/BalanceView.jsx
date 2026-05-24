import { useEffect, useState } from 'react';
import { fetchBalances } from '../api/balanceApi';
import { formatCurrency } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';

const BalanceView = ({ groupId }) => {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await fetchBalances(groupId);
        setBalances(data.balances);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load balances');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700" />
              <div className="flex-1">
                <div className="h-3 bg-slate-700 rounded w-24 mb-2" />
                <div className="h-2 bg-slate-800 rounded w-16" />
              </div>
              <div className="h-5 bg-slate-700 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20">
        <span className="text-danger-400 text-sm">{error}</span>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">⚖️</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-1">No balances yet</h3>
        <p className="text-sm text-slate-500">Add expenses to see who owes what.</p>
      </div>
    );
  }

  const myBalance = balances.find((b) => b.user?._id === user?._id)?.netBalance || 0;

  return (
    <div className="space-y-4">
      {/* My Summary */}
      <div className={`p-4 rounded-2xl border ${
        myBalance > 0
          ? 'bg-success-500/10 border-success-500/20'
          : myBalance < 0
          ? 'bg-danger-500/10 border-danger-500/20'
          : 'bg-slate-800/40 border-slate-700/40'
      }`}>
        <p className="text-xs text-slate-400 mb-1">Your net balance in this group</p>
        <p className={`text-2xl font-bold ${
          myBalance > 0 ? 'text-success-400' : myBalance < 0 ? 'text-danger-400' : 'text-slate-400'
        }`}>
          {myBalance > 0
            ? `+${formatCurrency(myBalance)}`
            : myBalance < 0
            ? `-${formatCurrency(Math.abs(myBalance))}`
            : 'All settled up! 🎉'}
        </p>
        {myBalance !== 0 && (
          <p className="text-xs text-slate-500 mt-1">
            {myBalance > 0 ? 'You are owed this amount' : 'You owe this amount'}
          </p>
        )}
      </div>

      {/* All member balances */}
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">All Balances</h3>
        <div className="space-y-2">
          {balances.map((b) => {
            const isMe = b.user?._id === user?._id;
            const bal = b.netBalance;
            const isPositive = bal > 0.005;
            const isNegative = bal < -0.005;

            return (
              <div
                key={b.user?._id}
                className={`glass-card p-3.5 flex items-center gap-3 ${isMe ? 'ring-1 ring-primary-500/30' : ''}`}
                id={`balance-${b.user?._id}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {(b.user?.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {isMe ? `${b.user?.name} (You)` : b.user?.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{b.user?.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${
                    isPositive ? 'text-success-400' : isNegative ? 'text-danger-400' : 'text-slate-400'
                  }`}>
                    {isPositive ? '+' : ''}{formatCurrency(bal)}
                  </p>
                  <p className={`text-xs ${
                    isPositive ? 'text-success-500' : isNegative ? 'text-danger-500' : 'text-slate-500'
                  }`}>
                    {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;

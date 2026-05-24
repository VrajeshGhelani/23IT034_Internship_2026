import { useEffect, useState } from 'react';
import { fetchSettleUp, recordSettlement } from '../api/balanceApi';
import { formatCurrency } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';

const SettleUpView = ({ groupId, onSettled }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState({});
  const [settled, setSettled] = useState({});
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await fetchSettleUp(groupId);
      setTransactions(data.transactions);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settle-up');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const handleSettle = async (tx, index) => {
    setSettling((prev) => ({ ...prev, [index]: true }));
    try {
      await recordSettlement(groupId, {
        paidTo: tx.to._id,
        amount: tx.amount,
        note: 'Settled via SplitEase',
      });
      setSettled((prev) => ({ ...prev, [index]: true }));
      if (onSettled) onSettled();
      // Reload after short delay
      setTimeout(() => load(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling((prev) => ({ ...prev, [index]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-700" />
              <div className="flex-1 h-3 bg-slate-700 rounded" />
              <div className="w-9 h-9 rounded-full bg-slate-700" />
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

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-1">All settled up!</h3>
        <p className="text-sm text-slate-500">No outstanding balances in this group.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-600/10 border border-primary-500/20">
        <svg className="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-primary-300">
          {transactions.length} suggested payment{transactions.length !== 1 ? 's' : ''} to settle all debts.
        </p>
      </div>

      <div className="space-y-3">
        {transactions.map((tx, index) => {
          const isMe = tx.from?._id === user?._id;
          const isSettled = settled[index];

          return (
            <div
              key={index}
              className={`glass-card p-4 transition-all duration-300 ${isSettled ? 'opacity-50 scale-95' : ''}`}
              id={`settle-tx-${index}`}
            >
              <div className="flex items-center gap-3">
                {/* From */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${isMe ? 'from-danger-500 to-danger-600' : 'from-primary-500 to-accent-500'}`}>
                    {(tx.from?.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-500 max-w-[60px] text-center truncate">
                    {isMe ? 'You' : tx.from?.name}
                  </span>
                </div>

                {/* Arrow + amount */}
                <div className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-lg font-bold text-slate-100">{formatCurrency(tx.amount)}</span>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-px bg-gradient-to-r from-danger-500/50 to-success-500/50" />
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <div className="flex-1 h-px bg-gradient-to-r from-danger-500/50 to-success-500/50" />
                  </div>
                  <span className="text-[10px] text-slate-500">pays</span>
                </div>

                {/* To */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${tx.to?._id === user?._id ? 'from-success-500 to-success-600' : 'from-primary-500 to-accent-500'}`}>
                    {(tx.to?.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-500 max-w-[60px] text-center truncate">
                    {tx.to?._id === user?._id ? 'You' : tx.to?.name}
                  </span>
                </div>
              </div>

              {/* Settle button (only if I'm the one who owes) */}
              {isMe && !isSettled && (
                <button
                  onClick={() => handleSettle(tx, index)}
                  disabled={settling[index]}
                  className="btn-success w-full mt-3 text-sm"
                  id={`settle-btn-${index}`}
                >
                  {settling[index] ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Recording…
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Settled
                    </>
                  )}
                </button>
              )}

              {isSettled && (
                <div className="flex items-center justify-center gap-2 mt-3 text-success-400 text-sm font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Settled!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SettleUpView;

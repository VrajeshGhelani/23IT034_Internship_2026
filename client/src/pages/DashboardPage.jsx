import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api/balanceApi';
import { formatCurrency } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';
import SummaryCard from '../components/SummaryCard';
import GroupCard from '../components/GroupCard';

const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await fetchDashboard();
        setSummary(data.summary);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded-xl w-48" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-slate-800 rounded-2xl" />
            <div className="h-28 bg-slate-800 rounded-2xl" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-800 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
            Hey, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's your expense summary</p>
        </div>
        <Link to="/groups" className="btn-primary" id="go-to-groups-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          My Groups
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 mb-6">
          <span className="text-danger-400 text-sm">{error}</span>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <SummaryCard
              title="Total You Owe"
              amount={formatCurrency(summary.totalOwe)}
              icon="💸"
              color="danger"
              subtitle="Across all groups"
            />
            <SummaryCard
              title="Total Owed to You"
              amount={formatCurrency(summary.totalOwed)}
              icon="💰"
              color="success"
              subtitle="Across all groups"
            />
          </div>

          {/* Net overall */}
          <div className="glass-card p-5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Overall Net Balance</p>
                <p className={`text-3xl font-bold mt-1 ${
                  summary.totalOwed - summary.totalOwe >= 0 ? 'text-success-400' : 'text-danger-400'
                }`}>
                  {summary.totalOwed - summary.totalOwe >= 0 ? '+' : ''}
                  {formatCurrency(summary.totalOwed - summary.totalOwe)}
                </p>
              </div>
              <div className="text-4xl">
                {summary.totalOwed - summary.totalOwe >= 0 ? '📈' : '📉'}
              </div>
            </div>
          </div>

          {/* Groups list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100">Your Groups</h2>
              <Link to="/groups/new" className="btn-secondary text-sm" id="create-group-btn-dash">
                + New Group
              </Link>
            </div>

            {summary.groups.length === 0 ? (
              <div className="glass-card p-8 flex flex-col items-center text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">No groups yet</h3>
                <p className="text-sm text-slate-500 mb-4">Create a group to start splitting expenses.</p>
                <Link to="/groups/new" className="btn-primary" id="create-first-group-btn">
                  Create Group
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.groups.map(({ group, myBalance }) => (
                  <GroupCard key={group._id} group={group} myBalance={myBalance} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;

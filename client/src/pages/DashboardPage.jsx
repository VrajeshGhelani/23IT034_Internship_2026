import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api/balanceApi';
import { formatCurrency } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';
import SummaryCard from '../components/SummaryCard';
import GroupCard from '../components/GroupCard';
import axiosInstance from '../api/axiosInstance';
import CategoryPieChart from '../components/analytics/CategoryPieChart';
import MonthlyTrendChart from '../components/analytics/MonthlyTrendChart';
import SummaryCards from '../components/analytics/SummaryCards';

const DashboardPage = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard analytics
  const [dashAnalytics, setDashAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Handle Google OAuth token from URL (redirect lands on /dashboard?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, '', '/dashboard');
      window.location.reload();
    }
  }, []);

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

  // Fetch dashboard analytics
  const loadDashboardAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await axiosInstance.get('/api/dashboard/analytics');
      setDashAnalytics(data.analytics);
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (showAnalytics) {
      loadDashboardAnalytics();
    }
  }, [showAnalytics]);

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

          {/* Overall Analytics Section */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                📊 Your Overall Analytics
              </h2>
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="btn-secondary text-sm"
                id="toggle-dashboard-analytics-btn"
              >
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </button>
            </div>

            {showAnalytics && (
              <div className="animate-fade-in space-y-6">
                {analyticsLoading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="glass-card p-4 animate-pulse">
                          <div className="h-3 bg-slate-800 rounded w-20 mb-3" />
                          <div className="h-6 bg-slate-800 rounded w-24" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="glass-card p-6 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-32 mb-4" />
                        <div className="h-48 bg-slate-800 rounded-xl" />
                      </div>
                      <div className="glass-card p-6 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-32 mb-4" />
                        <div className="h-48 bg-slate-800 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ) : dashAnalytics && dashAnalytics.totalExpenses > 0 ? (
                  <>
                    <SummaryCards analytics={dashAnalytics} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <CategoryPieChart data={dashAnalytics.categoryBreakdown} />
                      <MonthlyTrendChart data={dashAnalytics.monthlyTrend} />
                    </div>
                  </>
                ) : (
                  <div className="glass-card p-8 flex flex-col items-center text-center">
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No expense data yet</h3>
                    <p className="text-sm text-slate-500">
                      Start adding expenses to your groups to see aggregated analytics here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;

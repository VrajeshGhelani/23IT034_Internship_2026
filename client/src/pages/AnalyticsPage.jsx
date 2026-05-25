import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import SummaryCards from '../components/analytics/SummaryCards';
import CategoryPieChart from '../components/analytics/CategoryPieChart';
import MonthlyTrendChart from '../components/analytics/MonthlyTrendChart';
import MemberBalanceChart from '../components/analytics/MemberBalanceChart';
import DailyActivityChart from '../components/analytics/DailyActivityChart';
import SplitTypeChart from '../components/analytics/SplitTypeChart';
import TopSpenderCard from '../components/analytics/TopSpenderCard';
import { formatCurrency, formatRelativeTime, CATEGORY_ICONS } from '../utils/formatCurrency';

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'Last 6 months', value: '6m' },
  { label: 'All time', value: 'all' },
];

const SkeletonCard = ({ className = '' }) => (
  <div className={`glass-card p-6 animate-pulse ${className}`}>
    <div className="h-4 bg-slate-800 rounded w-32 mb-4" />
    <div className="h-48 bg-slate-800 rounded-xl" />
  </div>
);

const AnalyticsPage = ({ groupId, groupName, inline = false }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    if (!groupId) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axiosInstance.get(
          `/api/groups/${groupId}/analytics?range=${dateRange}`
        );
        setAnalytics(data.analytics);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [groupId, dateRange]);

  // Empty state
  if (!loading && analytics && analytics.totalExpenses === 0) {
    return (
      <div className={inline ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'}>
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-slate-200 mb-2">
            No expenses yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Add your first expense to see analytics! Charts and insights will
            appear here once you start tracking expenses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? '' : 'max-w-6xl mx-auto px-4 sm:px-6 py-8'} id="analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Analytics{groupName ? ` — ${groupName}` : ''}
            </h2>
            <p className="text-xs text-slate-500">
              {dateRange === 'all' ? 'All time' : DATE_RANGES.find((r) => r.value === dateRange)?.label}
            </p>
          </div>
        </div>

        {/* Date range filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="select-field w-auto min-w-[160px]"
          id="analytics-date-range"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 mb-6">
          <span className="text-danger-400 text-sm">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          {/* Summary skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-20 mb-3" />
                <div className="h-6 bg-slate-800 rounded w-24" />
              </div>
            ))}
          </div>
          {/* Chart skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <SkeletonCard className="lg:col-span-2" />
            <SkeletonCard className="lg:col-span-3" />
          </div>
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <SkeletonCard className="lg:col-span-3" />
            <SkeletonCard className="lg:col-span-2" />
          </div>
        </div>
      )}

      {/* Analytics content */}
      {!loading && analytics && (
        <div className="space-y-6">
          {/* Summary cards */}
          <SummaryCards analytics={analytics} />

          {/* Row: Category Pie + Monthly Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <CategoryPieChart data={analytics.categoryBreakdown} />
            </div>
            <div className="lg:col-span-3">
              <MonthlyTrendChart data={analytics.monthlyTrend} />
            </div>
          </div>

          {/* Member Balance (full width) */}
          <MemberBalanceChart data={analytics.memberSpending} />

          {/* Row: Daily Activity + Split Type */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <DailyActivityChart data={analytics.expensesByDay} />
            </div>
            <div className="lg:col-span-2">
              <SplitTypeChart data={analytics.splitTypeUsage} />
            </div>
          </div>

          {/* Row: Top Spender + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopSpenderCard
              topSpender={analytics.topSpender}
              totalAmount={analytics.totalAmount}
            />

            {/* Recent Activity */}
            <div className="glass-card p-6" id="recent-activity-list">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="text-lg">🕐</span>
                Recent Activity
              </h3>

              {analytics.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                        {CATEGORY_ICONS[item.category] || '💰'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.paidBy} · {formatRelativeTime(item.date)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-200 flex-shrink-0">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;

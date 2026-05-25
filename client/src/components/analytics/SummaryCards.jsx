import { formatCurrency } from '../../utils/formatCurrency';

const SummaryCards = ({ analytics }) => {
  const cards = [
    {
      icon: '💰',
      label: 'Total Spent',
      value: formatCurrency(analytics?.totalAmount || 0),
      borderColor: 'border-l-blue-500',
      bgGlow: 'from-blue-500/5',
    },
    {
      icon: '📊',
      label: 'Expenses Count',
      value: analytics?.totalExpenses || 0,
      borderColor: 'border-l-emerald-500',
      bgGlow: 'from-emerald-500/5',
    },
    {
      icon: '🏆',
      label: 'Top Category',
      value: analytics?.mostExpensiveCategory || 'N/A',
      borderColor: 'border-l-orange-500',
      bgGlow: 'from-orange-500/5',
    },
    {
      icon: '📅',
      label: 'Most Active Month',
      value: analytics?.mostActiveMonth || 'N/A',
      borderColor: 'border-l-purple-500',
      bgGlow: 'from-purple-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="analytics-summary-cards">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`relative bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 border-l-4 ${card.borderColor} overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
        >
          {/* Subtle glow */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${card.bgGlow} to-transparent opacity-50 pointer-events-none`}
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-100 truncate">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;

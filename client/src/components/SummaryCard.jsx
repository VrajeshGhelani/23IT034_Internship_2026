const SummaryCard = ({ title, amount, icon, color = 'primary', subtitle }) => {
  const colorMap = {
    primary: {
      bg: 'from-primary-600/20 to-primary-800/10',
      border: 'border-primary-500/20',
      icon: 'bg-primary-600/30 text-primary-400',
      amount: 'text-primary-400',
    },
    success: {
      bg: 'from-success-600/20 to-success-800/10',
      border: 'border-success-500/20',
      icon: 'bg-success-600/30 text-success-400',
      amount: 'text-success-400',
    },
    danger: {
      bg: 'from-danger-600/20 to-danger-800/10',
      border: 'border-danger-500/20',
      icon: 'bg-danger-600/30 text-danger-400',
      amount: 'text-danger-400',
    },
    accent: {
      bg: 'from-accent-600/20 to-accent-800/10',
      border: 'border-accent-500/20',
      icon: 'bg-accent-600/30 text-accent-400',
      amount: 'text-accent-400',
    },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${c.bg} ${c.border} animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.icon}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${c.amount}`}>{amount}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
};

export default SummaryCard;

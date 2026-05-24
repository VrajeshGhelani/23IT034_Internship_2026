/**
 * Format a number as currency with ₹ symbol.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code, default 'INR'
 * @returns {string}
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Format a number as a short currency string (no symbol).
 */
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Get relative time string from a date.
 */
export const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * Get avatar initials from name.
 */
export const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Category icon mapping.
 */
export const CATEGORY_ICONS = {
  Food: '🍔',
  Travel: '✈️',
  Rent: '🏠',
  Entertainment: '🎬',
  Utilities: '💡',
  Other: '💰',
};

export const CATEGORIES = ['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Other'];
export const SPLIT_TYPES = ['equal', 'exact', 'percentage', 'shares'];

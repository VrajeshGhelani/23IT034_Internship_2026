import { useState } from 'react';
import { formatCurrency, formatRelativeTime, CATEGORY_ICONS } from '../utils/formatCurrency';
import useAuth from '../hooks/useAuth';
import { replaceReceipt } from '../api/expenseApi';

const ReceiptLightbox = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-lg"
        id="close-lightbox-btn"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={url}
        alt="Receipt"
        className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
      />
    </div>
  </div>
);

const ExpenseList = ({ expenses, onDelete, onEdit, onExpenseUpdate }) => {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [replacingReceipt, setReplacingReceipt] = useState(null);

  const handleReplaceReceipt = async (expenseId, file) => {
    if (!file) return;
    setReplacingReceipt(expenseId);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      const { data } = await replaceReceipt(expenseId, formData);
      if (onExpenseUpdate) onExpenseUpdate(data.expense);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to replace receipt');
    } finally {
      setReplacingReceipt(null);
    }
  };

  const isPdf = (url) => url?.toLowerCase().endsWith('.pdf') || url?.includes('/raw/');

  if (!expenses || expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">💸</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-1">No expenses yet</h3>
        <p className="text-sm text-slate-500">Add the first expense to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {expenses.map((expense) => {
          const isExpanded = expandedId === expense._id;
          const paidByMe = expense.paidBy?._id === user?._id;
          const myShare = expense.splits?.find((s) => s.user?._id === user?._id)?.amount || 0;
          const icon = CATEGORY_ICONS[expense.category] || '💰';
          const hasReceipt = expense.receipt?.url;

          return (
            <div
              key={expense._id}
              className="glass-card overflow-hidden transition-all duration-200"
              id={`expense-${expense._id}`}
            >
              <button
                className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-800/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : expense._id)}
              >
                {/* Category icon */}
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                  {icon}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-100 truncate">{expense.title}</p>
                        {hasReceipt && (
                          <span className="flex-shrink-0 w-4 h-4 text-slate-500" title="Has receipt">
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paid by{' '}
                        <span className="text-slate-400 font-medium">
                          {paidByMe ? 'you' : expense.paidBy?.name || 'Unknown'}
                        </span>{' '}
                        · {formatRelativeTime(expense.date)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-slate-100">{formatCurrency(expense.amount)}</p>
                      <p className={`text-xs mt-0.5 ${paidByMe ? 'text-success-400' : 'text-danger-400'}`}>
                        {paidByMe
                          ? `You lent ${formatCurrency(expense.amount - myShare)}`
                          : `Your share ${formatCurrency(myShare)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded split details */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 px-4 pb-4 pt-3 animate-slide-down">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="badge bg-primary-600/20 text-primary-400 border border-primary-500/20">
                        {expense.splitType}
                      </span>
                      <span className="badge bg-slate-700 text-slate-300">{expense.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(expense.createdBy?._id === user?._id) && (
                        <>
                          <button
                            onClick={() => onEdit && onEdit(expense)}
                            className="text-xs text-primary-400 hover:text-primary-300 transition-colors px-2 py-1 rounded hover:bg-primary-500/10"
                            id={`edit-expense-${expense._id}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete && onDelete(expense._id)}
                            className="text-xs text-danger-400 hover:text-danger-300 transition-colors px-2 py-1 rounded hover:bg-danger-500/10"
                            id={`delete-expense-${expense._id}`}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Receipt Display */}
                  {hasReceipt && (
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Receipt</h4>
                      {isPdf(expense.receipt.url) ? (
                        <a
                          href={expense.receipt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-primary-400 hover:text-primary-300 hover:border-slate-600 transition-all"
                          id={`view-receipt-pdf-${expense._id}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          View Receipt PDF
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <button
                          onClick={() => setLightboxUrl(expense.receipt.url)}
                          className="group relative rounded-xl overflow-hidden border border-slate-700 hover:border-slate-500 transition-all"
                          id={`view-receipt-${expense._id}`}
                        >
                          <img
                            src={expense.receipt.url}
                            alt="Receipt"
                            className="w-24 h-24 object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                            <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </button>
                      )}

                      {/* Replace receipt button */}
                      {(expense.createdBy?._id === user?._id) && (
                        <label
                          className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all ${
                            replacingReceipt === expense._id
                              ? 'bg-slate-700 text-slate-400'
                              : 'bg-slate-800 text-slate-400 hover:text-primary-400 hover:bg-slate-700'
                          }`}
                          id={`replace-receipt-${expense._id}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {replacingReceipt === expense._id ? 'Uploading…' : 'Replace Receipt'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            className="hidden"
                            disabled={replacingReceipt === expense._id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReplaceReceipt(expense._id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Split Breakdown</h4>
                  <div className="space-y-1.5">
                    {expense.splits?.map((split, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {(split.user?.name || '?')[0].toUpperCase()}
                          </div>
                          <span className="text-slate-300">
                            {split.user?._id === user?._id ? 'You' : split.user?.name || 'Unknown'}
                          </span>
                        </div>
                        <span className="font-medium text-slate-200">{formatCurrency(split.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <ReceiptLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
};

export default ExpenseList;

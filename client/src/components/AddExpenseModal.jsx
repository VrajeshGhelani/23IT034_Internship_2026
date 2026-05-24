import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../hooks/useAuth';
import { CATEGORIES, formatCurrency } from '../utils/formatCurrency';

const AddExpenseModal = ({ isOpen, onClose, onSubmit, members = [], editingExpense = null }) => {
  const { user } = useAuth();
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      paidBy: user?._id || '',
      splitType: 'equal',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const [splitData, setSplitData] = useState({});
  const [equalMembers, setEqualMembers] = useState({});
  const [formError, setFormError] = useState('');

  // Receipt state
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileInputRef = useRef(null);

  const splitType = watch('splitType');
  const amount = parseFloat(watch('amount')) || 0;

  // Initialize equal members with all checked
  useEffect(() => {
    const initial = {};
    members.forEach((m) => { initial[m._id] = true; });
    setEqualMembers(initial);
  }, [members]);

  // Initialize when editing
  useEffect(() => {
    if (editingExpense) {
      setValue('title', editingExpense.title || '');
      setValue('amount', editingExpense.amount || '');
      setValue('paidBy', editingExpense.paidBy?._id || '');
      setValue('splitType', editingExpense.splitType || 'equal');
      setValue('category', editingExpense.category || 'Other');
      setValue('date', editingExpense.date ? new Date(editingExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

      const splitMap = {};
      if (editingExpense.splits) {
        editingExpense.splits.forEach((s) => { splitMap[s.user?._id || s.user] = s.amount; });
      }
      setSplitData(splitMap);

      if (editingExpense.splitType === 'equal') {
        const eqMap = {};
        members.forEach((m) => { eqMap[m._id] = editingExpense.splits?.some((s) => (s.user?._id || s.user) === m._id) ?? true; });
        setEqualMembers(eqMap);
      }
    } else {
      reset({ title: '', amount: '', paidBy: user?._id || '', splitType: 'equal', category: 'Other', date: new Date().toISOString().split('T')[0] });
      setSplitData({});
      const initial = {};
      members.forEach((m) => { initial[m._id] = true; });
      setEqualMembers(initial);
    }
    setFormError('');
    setReceiptFile(null);
    setReceiptPreview(null);
  }, [editingExpense, isOpen]);

  const handleSplitDataChange = (userId, value) => {
    setSplitData((prev) => ({ ...prev, [userId]: parseFloat(value) || 0 }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFormError('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size exceeds 5MB limit.');
      return;
    }

    setFormError('');
    setReceiptFile(file);

    if (file.type.startsWith('image/')) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const buildSplits = (data) => {
    const { splitType, amount: amtStr } = data;
    const amt = parseFloat(amtStr);

    if (splitType === 'equal') {
      const selected = members.filter((m) => equalMembers[m._id]);
      if (selected.length === 0) { setFormError('Select at least one member for equal split'); return null; }
      return selected.map((m) => ({ user: m._id }));
    }

    if (splitType === 'exact') {
      const splits = members.map((m) => ({ user: m._id, amount: splitData[m._id] || 0 })).filter((s) => s.amount > 0);
      const total = splits.reduce((s, r) => s + r.amount, 0);
      if (Math.abs(total - amt) > 0.01) { setFormError(`Exact amounts must sum to ${formatCurrency(amt)}. Current: ${formatCurrency(total)}`); return null; }
      return splits;
    }

    if (splitType === 'percentage') {
      const splits = members.map((m) => ({ user: m._id, value: splitData[m._id] || 0 })).filter((s) => s.value > 0);
      const total = splits.reduce((s, r) => s + r.value, 0);
      if (Math.abs(total - 100) > 0.01) { setFormError(`Percentages must sum to 100%. Current: ${total.toFixed(1)}%`); return null; }
      return splits;
    }

    if (splitType === 'shares') {
      const splits = members.map((m) => ({ user: m._id, value: splitData[m._id] || 0 })).filter((s) => s.value > 0);
      if (splits.length === 0) { setFormError('Enter shares for at least one member'); return null; }
      return splits;
    }

    return null;
  };

  const onFormSubmit = async (data) => {
    setFormError('');
    const splits = buildSplits(data);
    if (!splits) return;

    try {
      // Use FormData when there's a receipt file, otherwise JSON
      if (receiptFile) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('amount', parseFloat(data.amount));
        formData.append('paidBy', data.paidBy);
        formData.append('splitType', data.splitType);
        formData.append('splits', JSON.stringify(splits));
        formData.append('category', data.category);
        formData.append('date', data.date);
        formData.append('receipt', receiptFile);
        await onSubmit(formData, editingExpense?._id);
      } else {
        const payload = {
          title: data.title,
          amount: parseFloat(data.amount),
          paidBy: data.paidBy,
          splitType: data.splitType,
          splits,
          category: data.category,
          date: data.date,
        };
        await onSubmit(payload, editingExpense?._id);
      }
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save expense');
    }
  };

  const getSplitHint = () => {
    if (splitType === 'equal') return null;
    if (!amount) return null;

    if (splitType === 'exact') {
      const total = members.reduce((s, m) => s + (splitData[m._id] || 0), 0);
      const diff = amount - total;
      return diff !== 0 ? `Remaining: ${formatCurrency(Math.abs(diff))} ${diff > 0 ? 'unassigned' : 'over'}` : '✓ Balanced';
    }
    if (splitType === 'percentage') {
      const total = members.reduce((s, m) => s + (splitData[m._id] || 0), 0);
      const diff = 100 - total;
      return diff !== 0 ? `Remaining: ${Math.abs(diff).toFixed(1)}% ${diff > 0 ? 'unassigned' : 'over'}` : '✓ 100%';
    }
    if (splitType === 'shares') {
      const totalShares = members.reduce((s, m) => s + (splitData[m._id] || 0), 0);
      if (totalShares === 0) return null;
      return members
        .filter((m) => splitData[m._id] > 0)
        .map((m) => `${m.name}: ${formatCurrency(((splitData[m._id] || 0) / totalShares) * amount)}`)
        .join(' · ');
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/80 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-slate-100">
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors" id="close-modal-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="form-label" htmlFor="expense-title">Title *</label>
            <input
              id="expense-title"
              className="input-field"
              placeholder="e.g. Dinner at restaurant"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="text-danger-400 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="expense-amount">Amount (₹) *</label>
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="input-field"
                placeholder="0.00"
                {...register('amount', { required: 'Amount is required', min: { value: 0.01, message: 'Must be > 0' } })}
              />
              {errors.amount && <p className="text-danger-400 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="expense-category">Category</label>
              <select id="expense-category" className="select-field" {...register('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Paid By + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="expense-paidby">Paid By *</label>
              <select id="expense-paidby" className="select-field" {...register('paidBy', { required: true })}>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m._id === user?._id ? `${m.name} (You)` : m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="expense-date">Date</label>
              <input id="expense-date" type="date" className="input-field" {...register('date')} />
            </div>
          </div>

          {/* Split Type */}
          <div>
            <label className="form-label">Split Type *</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['equal', 'exact', 'percentage', 'shares'].map((type) => (
                <label
                  key={type}
                  className={`flex items-center justify-center px-2 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                    splitType === type
                      ? 'bg-primary-600/20 border-primary-500/40 text-primary-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <input type="radio" value={type} {...register('splitType')} className="sr-only" />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Split inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Members</label>
              {getSplitHint() && (
                <span className={`text-xs ${getSplitHint()?.startsWith('✓') ? 'text-success-400' : 'text-amber-400'}`}>
                  {getSplitHint()}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {members.map((member) => (
                <div key={member._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/60">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(member.name || '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300 flex-1 truncate">
                    {member._id === user?._id ? `${member.name} (You)` : member.name}
                  </span>

                  {splitType === 'equal' && (
                    <input
                      type="checkbox"
                      id={`equal-${member._id}`}
                      checked={equalMembers[member._id] ?? true}
                      onChange={(e) => setEqualMembers((prev) => ({ ...prev, [member._id]: e.target.checked }))}
                      className="w-4 h-4 accent-primary-500 rounded cursor-pointer"
                    />
                  )}

                  {splitType === 'exact' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹0.00"
                      value={splitData[member._id] || ''}
                      onChange={(e) => handleSplitDataChange(member._id, e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  )}

                  {splitType === 'percentage' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={splitData[member._id] || ''}
                        onChange={(e) => handleSplitDataChange(member._id, e.target.value)}
                        className="w-16 px-2 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-right"
                      />
                      <span className="text-slate-400 text-sm">%</span>
                    </div>
                  )}

                  {splitType === 'shares' && (
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      value={splitData[member._id] || ''}
                      onChange={(e) => handleSplitDataChange(member._id, e.target.value)}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-center"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="form-label">Upload Receipt (optional)</label>
            {!receiptFile ? (
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary-500/50 hover:bg-slate-800/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                id="receipt-dropzone"
              >
                <svg className="w-8 h-8 mx-auto text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-slate-400">Click or drag to upload receipt</p>
                <p className="text-xs text-slate-600 mt-1">JPG, PNG, WEBP, PDF · Max 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="receipt-file-input"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
                {receiptPreview && (
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="w-full max-h-40 object-contain rounded-lg mb-3"
                  />
                )}
                {receiptFile.type === 'application/pdf' && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-700/50">
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-slate-300">PDF Receipt</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 truncate">{receiptFile.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(receiptFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={removeReceipt}
                    className="flex-shrink-0 text-xs text-danger-400 hover:text-danger-300 px-2 py-1 rounded hover:bg-danger-500/10 transition-colors"
                    id="remove-receipt-btn"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20">
              <svg className="w-4 h-4 text-danger-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-danger-400">{formError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" id="cancel-expense-btn">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} id="submit-expense-btn">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </span>
              ) : editingExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;

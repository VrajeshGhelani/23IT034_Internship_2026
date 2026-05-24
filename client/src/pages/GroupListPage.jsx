import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useGroups from '../hooks/useGroups';
import GroupCard from '../components/GroupCard';
import { fetchDashboard } from '../api/balanceApi';

const GroupListPage = () => {
  const { groups, loading, error, loadGroups, create } = useGroups();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState('');
  const [balances, setBalances] = useState({});
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Load balances via dashboard
  useEffect(() => {
    const loadBalances = async () => {
      try {
        const { data } = await fetchDashboard();
        const map = {};
        (data.summary?.groups || []).forEach(({ group, myBalance }) => {
          map[group._id] = myBalance;
        });
        setBalances(map);
      } catch {}
    };
    loadBalances();
  }, [groups]);

  const onCreateGroup = async (data) => {
    setCreateError('');
    try {
      await create({ name: data.name, description: data.description });
      reset();
      setShowCreateModal(false);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create group');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">My Groups</h1>
          <p className="text-slate-400 text-sm mt-1">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary" id="create-group-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Group
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 mb-6">
          <span className="text-danger-400 text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700" />
                <div className="flex-1">
                  <div className="h-3 bg-slate-700 rounded w-32 mb-2" />
                  <div className="h-2 bg-slate-800 rounded w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No groups yet</h3>
          <p className="text-slate-500 mb-6">Create a group and invite friends to start splitting expenses.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary" id="create-first-group-btn-list">
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard key={group._id} group={group} myBalance={balances[group._id] || 0} />
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative glass-card w-full max-w-md shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-slate-100">Create New Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                id="close-create-group-modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateGroup)} className="p-5 space-y-4">
              <div>
                <label className="form-label" htmlFor="group-name">Group Name *</label>
                <input
                  id="group-name"
                  className="input-field"
                  placeholder="e.g. Goa Trip 2024"
                  {...register('name', { required: 'Group name is required' })}
                />
                {errors.name && <p className="text-danger-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="form-label" htmlFor="group-description">Description</label>
                <textarea
                  id="group-description"
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Optional description…"
                  {...register('description')}
                />
              </div>

              {createError && (
                <p className="text-danger-400 text-sm">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  id="cancel-create-group"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting} id="submit-create-group">
                  {isSubmitting ? 'Creating…' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupListPage;

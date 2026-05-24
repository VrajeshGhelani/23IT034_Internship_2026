import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGroup, addMember, removeMember, deleteGroup, generateInviteLink, revokeInviteLink, exportGroupPDF } from '../api/groupApi';
import useExpenses from '../hooks/useExpenses';
import useAuth from '../hooks/useAuth';
import ExpenseList from '../components/ExpenseList';
import AddExpenseModal from '../components/AddExpenseModal';
import BalanceView from '../components/BalanceView';
import SettleUpView from '../components/SettleUpView';
import ActivityFeed from '../components/ActivityFeed';
import { getInitials } from '../utils/formatCurrency';

const TABS = ['Expenses', 'Balances', 'Settle Up', 'Activity'];

const GroupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Expenses');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Invite link state
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('');
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // PDF export state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  const { expenses, loading: expLoading, loadExpenses, add, update, remove } = useExpenses(id);

  useEffect(() => {
    const loadGroup = async () => {
      try {
        const { data } = await fetchGroup(id);
        setGroup(data.group);
      } catch {
        navigate('/groups');
      } finally {
        setGroupLoading(false);
      }
    };
    loadGroup();
  }, [id]);

  useEffect(() => {
    loadExpenses();
  }, [id]);

  const handleExpenseSubmit = async (payload, expenseId) => {
    if (expenseId) {
      await update(expenseId, payload);
    } else {
      await add(payload);
    }
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    await remove(expenseId);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleExpenseUpdate = (updatedExpense) => {
    loadExpenses();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviteLoading(true);
    try {
      const { data } = await addMember(id, inviteEmail.trim());
      setGroup(data.group);
      setInviteEmail('');
      setShowInvite(false);
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const { data } = await removeMember(id, userId);
      setGroup(data.group);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group and all its expenses? This cannot be undone.')) return;
    try {
      await deleteGroup(id);
      navigate('/groups');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete group');
    }
  };

  // ── Invite Link Handlers ──
  const handleGenerateInviteLink = async () => {
    setInviteLinkLoading(true);
    try {
      const { data } = await generateInviteLink(id);
      setInviteUrl(data.inviteUrl);
      setInviteExpiry(data.expiresAt);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate invite link');
    } finally {
      setInviteLinkLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeInviteLink(id);
      setInviteUrl('');
      setInviteExpiry('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke invite link');
    }
  };

  // ── PDF Export Handler ──
  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const { data } = await exportGroupPDF(id);
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (group?.name || 'group').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
      a.href = url;
      a.download = `${safeName}-expenses.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setPdfToast('PDF downloaded!');
      setTimeout(() => setPdfToast(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const isCreator = group?.createdBy?._id === user?._id;

  if (groupLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-48 mb-4" />
        <div className="h-4 bg-slate-800 rounded w-32 mb-8" />
        <div className="h-12 bg-slate-800 rounded-xl mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* PDF Toast */}
      {pdfToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-success-500/15 border border-success-500/30 shadow-lg animate-slide-down">
          <svg className="w-4 h-4 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-success-400">{pdfToast}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Groups
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600/40 to-accent-600/40 border border-primary-500/20 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{group.name}</h1>
              {group.description && <p className="text-sm text-slate-400 mt-0.5">{group.description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Export PDF button */}
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              className="btn-secondary text-sm flex items-center gap-1.5"
              id="export-pdf-btn"
            >
              {pdfLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {pdfLoading ? 'Exporting…' : 'Export PDF'}
            </button>

            <button
              onClick={() => setShowInvite(!showInvite)}
              className="btn-secondary text-sm"
              id="invite-member-btn"
            >
              + Invite
            </button>
            {isCreator && (
              <button
                onClick={handleDeleteGroup}
                className="btn-danger text-sm"
                id="delete-group-btn"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {group.members?.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs group"
              id={`member-${member._id}`}
            >
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[9px] font-bold text-white">
                  {getInitials(member.name)}
                </div>
              )}
              <span className="text-slate-300">{member._id === user?._id ? 'You' : member.name}</span>
              {isCreator && member._id !== user?._id && (
                <button
                  onClick={() => handleRemoveMember(member._id)}
                  className="text-slate-600 hover:text-danger-400 transition-colors ml-0.5"
                  title="Remove member"
                  id={`remove-member-${member._id}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mt-4 space-y-3 animate-slide-down">
            {/* Email invite */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter email to invite…"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  id="invite-email-input"
                />
                {inviteError && <p className="text-danger-400 text-xs mt-1">{inviteError}</p>}
              </div>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="btn-primary flex-shrink-0"
                id="send-invite-btn"
              >
                {inviteLoading ? '…' : 'Invite'}
              </button>
            </div>

            {/* Invite link section */}
            {isCreator && (
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Invite via Link
                  </h4>
                  {!inviteUrl && (
                    <button
                      onClick={handleGenerateInviteLink}
                      disabled={inviteLinkLoading}
                      className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                      id="generate-invite-link-btn"
                    >
                      {inviteLinkLoading ? 'Generating…' : 'Generate Link'}
                    </button>
                  )}
                </div>

                {inviteUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteUrl}
                        className="input-field text-xs font-mono flex-1"
                        id="invite-url-display"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          copied
                            ? 'bg-success-500/20 text-success-400 border border-success-500/30'
                            : 'bg-primary-600/20 text-primary-400 border border-primary-500/30 hover:bg-primary-600/30'
                        }`}
                        id="copy-invite-link-btn"
                      >
                        {copied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        Link expires in 7 days
                        {inviteExpiry && (
                          <span className="text-slate-600"> · {new Date(inviteExpiry).toLocaleDateString()}</span>
                        )}
                      </p>
                      <button
                        onClick={handleRevokeLink}
                        className="text-xs text-danger-400 hover:text-danger-300 transition-colors"
                        id="revoke-invite-link-btn"
                      >
                        Revoke Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Generate a shareable link anyone with the link can use to join this group.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-700/50 mb-6 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab-btn-active flex-1 min-w-fit' : 'tab-btn-inactive flex-1 min-w-fit'}
            id={`tab-${tab.replace(' ', '-').toLowerCase()}`}
          >
            {tab === 'Expenses' && '💸 '}
            {tab === 'Balances' && '⚖️ '}
            {tab === 'Settle Up' && '✅ '}
            {tab === 'Activity' && '📋 '}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'Expenses' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
                className="btn-primary text-sm"
                id="add-expense-btn"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
              </button>
            </div>
            <ExpenseList
              expenses={expenses}
              onDelete={handleDeleteExpense}
              onEdit={handleEditExpense}
              onExpenseUpdate={handleExpenseUpdate}
            />
          </div>
        )}

        {activeTab === 'Balances' && <BalanceView groupId={id} />}

        {activeTab === 'Settle Up' && (
          <SettleUpView groupId={id} onSettled={() => {}} />
        )}

        {activeTab === 'Activity' && <ActivityFeed groupId={id} />}
      </div>

      {/* Add/Edit Expense Modal */}
      <AddExpenseModal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
        onSubmit={handleExpenseSubmit}
        members={group.members || []}
        editingExpense={editingExpense}
      />
    </div>
  );
};

export default GroupDetailPage;

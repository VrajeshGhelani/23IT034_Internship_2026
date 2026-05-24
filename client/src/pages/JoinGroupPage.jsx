import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { previewInvite, joinByToken } from '../api/groupApi';

const JoinGroupPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');

  // Load invite preview
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const { data } = await previewInvite(token);
        setPreview(data);
      } catch (err) {
        setError(err.response?.data?.message || 'This invite link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [token]);

  const handleJoin = async () => {
    setJoinError('');
    setJoining(true);
    try {
      const { data } = await joinByToken(token);
      navigate(`/groups/${data.group._id}`, { replace: true });
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to join group.');
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold animate-pulse-slow shadow-lg shadow-primary-900/40">
            S
          </div>
          <p className="text-slate-400 text-sm">Loading invite…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger-500/10 border border-danger-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Invalid Invite Link</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-accent-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold shadow-2xl shadow-primary-900/50 mb-4">
            S
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">SplitEase</h1>
          <p className="text-slate-400 text-sm">You&apos;ve been invited!</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/30 to-accent-600/30 border border-primary-500/20 flex items-center justify-center text-3xl mx-auto mb-4">
            👥
          </div>

          <h2 className="text-xl font-bold text-slate-100 mb-1">{preview.groupName}</h2>
          <p className="text-slate-400 text-sm mb-1">
            Created by <span className="text-slate-300 font-medium">{preview.creatorName}</span>
          </p>
          <p className="text-slate-500 text-xs mb-6">
            {preview.memberCount} member{preview.memberCount !== 1 ? 's' : ''}
          </p>

          {user ? (
            <div className="space-y-3">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="btn-primary w-full py-3 text-base"
                id="join-group-btn"
              >
                {joining ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Joining…
                  </span>
                ) : (
                  `Join ${preview.groupName}`
                )}
              </button>

              {joinError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20">
                  <svg className="w-4 h-4 text-danger-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-danger-400">{joinError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">Sign in to join this group</p>
              <Link
                to="/login"
                state={{ redirectTo: `/join/${token}` }}
                className="btn-primary w-full py-3 text-base inline-block"
                id="signin-to-join-btn"
              >
                Sign In to Join
              </Link>
              <p className="text-xs text-slate-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-primary-400 hover:text-primary-300">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinGroupPage;

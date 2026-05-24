import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hydrateFromToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No authentication token received.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      try {
        await hydrateFromToken(token);
        navigate('/dashboard', { replace: true });
      } catch {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    handleCallback();
  }, [searchParams, hydrateFromToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-danger-500/10 border border-danger-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-danger-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-danger-400 text-sm">{error}</p>
            <p className="text-slate-500 text-xs">Redirecting to login…</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold animate-pulse-slow shadow-lg shadow-primary-900/40">
              S
            </div>
            <p className="text-slate-400 text-sm">Completing sign-in…</p>
            <svg className="w-5 h-5 animate-spin text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;

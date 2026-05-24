import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xl font-bold animate-pulse-slow shadow-lg shadow-primary-900/40">
            S
          </div>
          <p className="text-slate-400 text-sm">Loading SplitEase…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve redirectTo from location state (used by invite join flow)
    const redirectTo = location.state?.redirectTo || location.pathname;
    return <Navigate to="/login" state={{ from: location, redirectTo }} replace />;
  }

  return children;
};

export default ProtectedRoute;

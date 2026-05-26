import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupListPage from './pages/GroupListPage';
import GroupDetailPage from './pages/GroupDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotFoundPage from './pages/NotFoundPage';
import JoinGroupPage from './pages/JoinGroupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* OAuth callback (public — handles token from URL) */}
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Join group via invite link (public preview, auth for joining) */}
              <Route path="/join/:token" element={<JoinGroupPage />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups"
                element={
                  <ProtectedRoute>
                    <GroupListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups/:id"
                element={
                  <ProtectedRoute>
                    <GroupDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/groups/:id/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPageWrapper />
                  </ProtectedRoute>
                }
              />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-800/50 py-4 text-center">
            <p className="text-xs text-slate-600">
              SplitEase © {new Date().getFullYear()} · Split expenses with ease made by Vrajesh Ghelani.
            </p>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
};

// Wrapper to extract route params for standalone analytics page
const AnalyticsPageWrapper = () => {
  const { id } = useParams();
  return <AnalyticsPage groupId={id} />;
};

export default App;

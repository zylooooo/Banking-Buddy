import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ClientManagement from './pages/ClientManagement';
import AccountManagement from './pages/AccountManagement';
import TransactionView from './pages/TransactionView';
import UserManagement from './pages/UserManagement';
import CallbackPage from './pages/CallbackPage';
import { isAuthenticated, getUserRole } from './services/authService';

function ProtectedRoute({ children, requiredRole = null }) {
  const [authenticated, setAuthenticated] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      if (isAuth) {
        const role = await getUserRole();
        setUserRole(role);
      }
      setAuthenticated(isAuth);
    };
    checkAuth();
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Loading...</h2>
          <p className="text-sm sm:text-base text-slate-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function DashboardRouter() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
      setLoading(false);
    };
    fetchRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Loading...</h2>
          <p className="text-sm sm:text-base text-slate-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (userRole === 'admin') {
    return <Navigate to="/admin" />;
  } else if (userRole === 'agent') {
    return <Navigate to="/agent" />;
  } else {
    return <Navigate to="/" />;
  }
}

function RootRedirect() {
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      setShouldRedirect(isAuth);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Loading...</h2>
          <p className="text-sm sm:text-base text-slate-400">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return shouldRedirect ? <Navigate to="/dashboard" /> : <LoginPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/*"
          element={
            <ProtectedRoute requiredRole="agent">
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/*"
          element={
            <ProtectedRoute>
              <ClientManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/*"
          element={
            <ProtectedRoute>
              <AccountManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/*"
          element={
            <ProtectedRoute>
              <TransactionView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <UserManagement />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
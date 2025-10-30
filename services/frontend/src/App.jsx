import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CallbackPage from './pages/CallbackPage';
import MFASetupPage from './pages/MFASetupPage';
import ClientManagementPage from './pages/ClientManagementPage';
import ClientDetailPage from './pages/ClientDetailPage';
import UserManagementPage from './pages/UserManagementPage';
import AccountManagementPage from './pages/AccountManagementPage';
import TransactionManagementPage from './pages/TransactionManagementPage';
import CommunicationPage from './pages/CommunicationPage';
import { isAuthenticated } from './services/authService';

function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);
    };
    checkAuth();
  }, []);

  if (authenticated === null) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return authenticated ? children : <Navigate to="/" />;
}

function RootRedirect() {
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await isAuthenticated();
        setShouldRedirect(isAuth);
      } catch (error) {
        setShouldRedirect(false);
      } finally {
        setLoading(false);
      }
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
        <Route path="/setup-mfa" element={<MFASetupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:clientId"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications"
          element={
            <ProtectedRoute>
              <CommunicationPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
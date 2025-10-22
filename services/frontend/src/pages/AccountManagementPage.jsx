import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { clientApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

export default function AccountManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }

                const cognitoUser = await getUserFromToken();
                setCurrentUser(cognitoUser);

                // Check if user has admin privileges
                if (!cognitoUser || !['ADMIN', 'ROOT_ADMIN'].includes(cognitoUser.role)) {
                    setError('Access denied. Admin privileges required.');
                    setLoading(false);
                    return;
                }

                // Load all accounts
                const response = await clientApi.getAllAccounts();
                setAccounts(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handleDeleteAccount = async (accountId) => {
        if (window.confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            try {
                await clientApi.deleteAccount(accountId);
                // Refresh accounts list
                const response = await clientApi.getAllAccounts();
                setAccounts(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete account');
            }
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading...</p>
            </div>
        );
    }

    if (error && !currentUser) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="bg-slate-800 border border-red-700 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h2>
                    <p className="text-slate-300 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Calculate summary statistics
    const totalAccounts = accounts.length;
    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    const activeAccounts = accounts.filter(account => account.accountStatus === 'ACTIVE').length;
    const accountsByType = accounts.reduce((acc, account) => {
        acc[account.accountType] = (acc[account.accountType] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Account Management</h2>
                    <p className="text-slate-400">Overview and management of all client accounts</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="float-right text-red-300 hover:text-red-100"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-900 rounded-lg">
                                <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-slate-400">Total Accounts</p>
                                <p className="text-2xl font-semibold text-white">{totalAccounts}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-900 rounded-lg">
                                <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-slate-400">Total Balance</p>
                                <p className="text-2xl font-semibold text-white">{formatCurrency(totalBalance)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-900 rounded-lg">
                                <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-slate-400">Active Accounts</p>
                                <p className="text-2xl font-semibold text-white">{activeAccounts}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="p-2 bg-purple-900 rounded-lg mb-2">
                            <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="text-sm text-slate-400 mb-1">Account Types</p>
                        <div className="text-xs space-y-1">
                            {Object.entries(accountsByType).map(([type, count]) => (
                                <div key={type} className="flex justify-between text-slate-300">
                                    <span>{type}:</span>
                                    <span>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Accounts Table */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    <div className="p-6 border-b border-slate-700">
                        <h3 className="text-lg font-semibold text-white">All Accounts</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-medium">Account ID</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Client</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Agent</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Balance</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Created</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center p-8 text-slate-400">
                                            No accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    accounts.map((account) => (
                                        <tr key={account.accountId} className="border-b border-slate-700 hover:bg-slate-750">
                                            <td className="p-4 text-white font-mono text-sm">
                                                {account.accountId}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {account.clientFullName}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {account.agentId}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    account.accountType === 'CHECKING'
                                                        ? 'bg-blue-900 text-blue-300'
                                                        : account.accountType === 'SAVINGS'
                                                        ? 'bg-green-900 text-green-300'
                                                        : 'bg-purple-900 text-purple-300'
                                                }`}>
                                                    {account.accountType}
                                                </span>
                                            </td>
                                            <td className="p-4 text-white font-semibold">
                                                {formatCurrency(account.balance)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    account.accountStatus === 'ACTIVE'
                                                        ? 'bg-green-900 text-green-300'
                                                        : 'bg-red-900 text-red-300'
                                                }`}>
                                                    {account.accountStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/clients/${account.clientId}`)}
                                                        className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-sky-600 transition"
                                                    >
                                                        View Client
                                                    </button>
                                                    {(account.balance === 0 || account.balance === null) && (
                                                        <button
                                                            onClick={() => handleDeleteAccount(account.accountId)}
                                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </main>
            </div>
        </div>
    );
}
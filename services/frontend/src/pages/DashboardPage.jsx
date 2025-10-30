import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import UserCard from '../components/UserCard';

import axios from 'axios';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }

                // Get user ID from Cognito token first
                const cognitoUser = await getUserFromToken();
                if (!cognitoUser || !cognitoUser.sub) {
                    throw new Error('Unable to get user ID from token');
                }

                // Use the existing getUserById endpoint with the user's own ID
                const response = await userApi.getUserById(cognitoUser.sub);
                setUser(response.data.data); // Backend returns { data: UserDTO, message: string }
                setLoading(false);
            } catch (err) {
                console.error('Failed to load user data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load user data');
                setLoading(false);
            }
        };

        loadUser();
    }, [navigate]);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                // Get JWT token from localStorage for current user
                const cognitoUser = await getUserFromToken();
                let jwt = '';
                if (cognitoUser && cognitoUser.sub) {
                    const cognitoKeys = Object.keys(window.localStorage).filter(k => k.includes('CognitoIdentityServiceProvider') && k.includes(cognitoUser.sub) && k.endsWith('.idToken'));
                    if (cognitoKeys.length > 0) {
                        jwt = window.localStorage.getItem(cognitoKeys[cognitoKeys.length - 1]);
                    }
                }
                // Fetch logs from external endpoint with Bearer token
                const response = await axios.get('https://f827tiy8zj.execute-api.ap-southeast-1.amazonaws.com/api/v1/audit/logs', {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                });
                setLogs(response.data?.logs || []);
                setLogsLoading(false);
            } catch (err) {
                setLogsError(err.response?.data?.message || err.message || 'Failed to load recent activities');
                setLogsLoading(false);
            }
        };
        loadLogs();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="bg-slate-800 border border-red-700 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
                    <p className="text-slate-300 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={user} />
            <div className="ml-64">
                <Header user={user} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
                    <p className="text-slate-400">Welcome to Banking Buddy CRM System</p>
                </div>

                {/* Quick Action Cards for agent role */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {['admin', 'rootAdministrator'].includes(user.role) ? (
                        <>
                            {/* Create New Accounts Tab */}
                            <button
                                onClick={() => navigate('/users', { state: { openCreateForm: true } })}
                                className="bg-slate-800 border border-blue-700 rounded-lg p-6 hover:bg-blue-900 transition-colors group w-full text-left"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800 transition-colors">
                                        <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Create New Accounts</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Add a new user to the system</p>
                            </button>
                            {/* Manage Accounts Tab */}
                            <Link
                                to="/users"
                                className="bg-slate-800 border border-green-700 rounded-lg p-6 hover:bg-green-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800 transition-colors">
                                        <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Manage Accounts</h3>
                                </div>
                                <p className="text-slate-400 text-sm">View, edit, and manage all accounts</p>
                            </Link>
                            {/* View Transactions Tab */}
                            <Link
                                to="/transactions"
                                className="bg-slate-800 border border-purple-700 rounded-lg p-6 hover:bg-purple-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-purple-900 rounded-lg group-hover:bg-purple-800 transition-colors">
                                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">View Transactions</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Go to transactions page</p>
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* Create Client Profile Tab */}
                            <button
                                onClick={() => navigate('/clients', { state: { openCreateForm: true } })}
                                className="bg-slate-800 border border-blue-700 rounded-lg p-6 hover:bg-blue-900 transition-colors group w-full text-left"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800 transition-colors">
                                        <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Create Client Profile</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Open the client creation form</p>
                            </button>
                            {/* Manage Profiles Tab */}
                            <Link
                                to="/clients"
                                className="bg-slate-800 border border-green-700 rounded-lg p-6 hover:bg-green-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800 transition-colors">
                                        <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Manage Profiles</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Go to client management page</p>
                            </Link>
                            {/* View Transactions Tab */}
                            <Link
                                to="/transactions"
                                className="bg-slate-800 border border-purple-700 rounded-lg p-6 hover:bg-purple-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-purple-900 rounded-lg group-hover:bg-purple-800 transition-colors">
                                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">View Transactions</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Go to transactions page</p>
                            </Link>
                        </>
                    )}
                </div>

                {/* Recent Activities Tab */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Recent Activities</h2>
                    {logsLoading ? (
                        <div className="p-6 text-center text-slate-400">Loading recent activities...</div>
                    ) : logsError ? (
                        <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">{logsError}</div>
                    ) : logs.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">No recent activities found.</div>
                    ) : (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left p-4 text-slate-300 font-medium">User</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Date/Time</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Operation</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Client ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, idx) => (
                                        <tr key={idx} className="border-b border-slate-700 hover:bg-slate-750">
                                            <td className="p-4 text-slate-300">{log.agent_id || log.user_id || '-'}</td>
                                            <td className="p-4 text-slate-300 text-sm">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-SG') : ''}</td>
                                            <td className="p-4 text-slate-300">{log.crud_operation || '-'}</td>
                                            <td className="p-4 text-slate-300">{log.client_id || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ...removed User Information tab... */}
                </main>
            </div>
        </div>
    );
}
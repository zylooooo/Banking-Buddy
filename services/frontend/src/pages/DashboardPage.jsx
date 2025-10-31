import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { 
    CreateUserIcon, 
    ManageUsersIcon,
    CreateClientIcon,
    ManageClientsIcon,
    TransactionsIcon
} from '../components/Icons';

import axios from 'axios';
import { clientApi } from '../services/apiService';
// Helper to batch fetch user names and client names
async function fetchNamesFromLogs(logs, jwt) {
    // Collate unique user IDs and client IDs
    const userIds = Array.from(new Set(logs.map(l => l.agent_id || l.user_id).filter(Boolean)));
    const clientIds = Array.from(new Set(logs.map(l => l.client_id).filter(Boolean)));

    // Fetch user names
    const userNameMap = {};
    await Promise.all(userIds.map(async (uid) => {
        try {
            const resp = await axios.get(`/api/users/${uid}`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            // Combine firstName and lastName if available
            const userData = resp.data?.data || {};
            let fullName = '';
            if (userData.firstName || userData.lastName) {
                fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            }
            userNameMap[uid] = fullName || userData.username || userData.name || uid;
        } catch {
            userNameMap[uid] = uid;
        }
    }));

    // Fetch client names
    const clientNameMap = {};
    await Promise.all(clientIds.map(async (cid) => {
        try {
            const resp = await axios.get(`/api/clients/${cid}`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            const clientData = resp.data?.data || {};
            let fullName = '';
            if (clientData.firstName || clientData.lastName) {
                fullName = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
            }
            clientNameMap[cid] = fullName || clientData.name || clientData.clientName || cid;
        } catch {
            clientNameMap[cid] = cid;
        }
    }));

    return { userNameMap, clientNameMap };
}

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const [logsError, setLogsError] = useState(null);
    const [userNameMap, setUserNameMap] = useState({});
    const [clientNameMap, setClientNameMap] = useState({});
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
                let fetchedLogs = response.data?.logs || [];

                // Filter logs based on role
                const current = await getUserFromToken();
                if (current && current.role !== 'rootAdministrator') {
                    try {
                        if (current.role === 'agent') {
                            // For agents: Filter by client IDs from their own clients
                            const clientsResp = await clientApi.getAllClients(0, 100);
                            const pageData = clientsResp.data?.data;
                            
                            // Handle paginated response (content property) or array response
                            let clients = [];
                            if (Array.isArray(pageData)) {
                                clients = pageData;
                            } else if (pageData?.content) {
                                clients = pageData.content;
                            } else if (clientsResp.data?.clients) {
                                clients = clientsResp.data.clients;
                            }
                            
                            const clientIds = clients.map(c => c.id || c.clientId);
                            if (clientIds.length > 0) {
                                fetchedLogs = fetchedLogs.filter(l => clientIds.includes(l.client_id));
                            } else {
                                fetchedLogs = [];
                            }
                        } else if (current.role === 'admin') {
                            // For admins: Filter by agent IDs of agents they manage
                            const usersResp = await userApi.getAllUsers();
                            const managedAgents = (usersResp.data?.data || [])
                                .filter(user => user.role === 'agent')
                                .map(user => user.id);
                            
                            if (managedAgents.length > 0) {
                                // Filter logs where agent_id is in the list of managed agents
                                fetchedLogs = fetchedLogs.filter(l => managedAgents.includes(l.agent_id));
                            } else {
                                // Admin has no agents, so no logs to show
                                fetchedLogs = [];
                            }
                        }
                    } catch (e) {
                        // If fetch fails, fall back to empty for safety
                        console.error('Failed to filter logs:', e);
                        fetchedLogs = [];
                    }
                }
                setLogs(fetchedLogs);
                setLogsLoading(false);

                // Fetch user/client names for logs
                if (fetchedLogs.length > 0) {
                    const { userNameMap, clientNameMap } = await fetchNamesFromLogs(fetchedLogs, jwt);
                    setUserNameMap(userNameMap);
                    setClientNameMap(clientNameMap);
                } else {
                    setUserNameMap({});
                    setClientNameMap({});
                }
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

                {/* Quick Action Cards per role */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {(user.role === 'rootAdministrator' || user.role === 'admin') && (
                        <>
                            <button
                                onClick={() => navigate('/users', { state: { openCreateForm: true } })}
                                className="bg-slate-800 border border-blue-700 rounded-lg p-6 hover:bg-blue-900 transition-colors group w-full text-left"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800 transition-colors">
                                        <CreateUserIcon className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Create New User</h3>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {user.role === 'rootAdministrator' ? 'Add a new admin to the system' : 'Add a new agent to the system'}
                                </p>
                            </button>
                            <Link
                                to="/users"
                                className="bg-slate-800 border border-green-700 rounded-lg p-6 hover:bg-green-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800 transition-colors">
                                        <ManageUsersIcon className="w-6 h-6 text-green-300" />
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Manage Users</h3>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    {user.role === 'rootAdministrator' ? 'View and manage all admins' : 'View and manage all agents'}
                                </p>
                            </Link>
                        </>
                    )}
                    {user.role === 'agent' && (
                        <>
                            <button
                                onClick={() => navigate('/clients', { state: { openCreateForm: true } })}
                                className="bg-slate-800 border border-blue-700 rounded-lg p-6 hover:bg-blue-900 transition-colors group w-full text-left"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800 transition-colors">
                                        <CreateClientIcon className="w-6 h-6 text-blue-300" />
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Create Client Profile</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Open the client creation form</p>
                            </button>
                            <Link
                                to="/clients"
                                className="bg-slate-800 border border-green-700 rounded-lg p-6 hover:bg-green-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800 transition-colors">
                                        <ManageClientsIcon className="w-6 h-6 text-green-300" />
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Manage Profiles</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Go to client management page</p>
                            </Link>
                            <Link
                                to="/transactions"
                                className="bg-slate-800 border border-purple-700 rounded-lg p-6 hover:bg-purple-900 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-purple-900 rounded-lg group-hover:bg-purple-800 transition-colors">
                                        <TransactionsIcon className="w-6 h-6 text-purple-300" />
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
                                        <th className="text-left p-4 text-slate-300 font-medium">User Name</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Client Name</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Date/Time</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Operation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, idx) => {
                                        const uid = log.agent_id || log.user_id;
                                        const cid = log.client_id;
                                        return (
                                            <tr key={idx} className="border-b border-slate-700 hover:bg-slate-750">
                                                <td className="p-4 text-slate-300">{uid ? userNameMap[uid] || uid : '-'}</td>
                                                <td className="p-4 text-slate-300">{cid ? clientNameMap[cid] || cid : '-'}</td>
                                                <td className="p-4 text-slate-300 text-sm">{log.timestamp ? new Date(log.timestamp).toLocaleString('en-SG') : ''}</td>
                                                <td className="p-4 text-slate-300">{log.crud_operation || '-'}</td>
                                            </tr>
                                        );
                                    })}
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
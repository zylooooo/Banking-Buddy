import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi, clientApi, auditApi } from '../services/apiService';
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
    const [nextToken, setNextToken] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
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
                
                // Fetch logs based on role
                const current = await getUserFromToken();
                let fetchedLogs = [];
                let responseNextToken = null;
                let responseHasMore = false;
                
                if (current && current.role !== 'rootAdministrator') {
                    try {
                        if (current.role === 'agent') {
                            // For agents: Fetch logs by their own agent ID (last 24 hours), then filter by client IDs
                            const response = await auditApi.getLogsByAgentId(current.sub, 24);
                            fetchedLogs = response.data?.data || response.data?.logs || [];
                            
                            // Filter by client IDs from their own clients
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
                            // For admins: Fetch all logs with pagination, then filter by managed agents
                            // This is more efficient than multiple API calls
                            const usersResp = await userApi.getAllUsers();
                            // Handle paginated response (content property) or array response
                            let users = [];
                            const pageData = usersResp.data?.data;
                            if (Array.isArray(pageData)) {
                                users = pageData;
                            } else if (pageData?.content) {
                                users = pageData.content;
                            }
                            const managedAgents = users
                                .filter(user => user.role === 'agent')
                                .map(user => user.id);
                            
                            const adminId = current.sub || current.userId;
                            const allAgentIds = new Set([...managedAgents]);
                            if (adminId) {
                                allAgentIds.add(adminId);
                            }
                            
                            // Fetch logs with pagination (last 24 hours) - fetch more to account for filtering
                            // We'll fetch 50 logs and filter, then take first 10
                            const response = await auditApi.getLogsPaginated(50, null, null, 24);
                            let allFetchedLogs = response.data?.logs || [];
                            responseNextToken = response.data?.next_token || null;
                            responseHasMore = response.data?.has_more || false;
                            
                            // Sort by timestamp descending (most recent first) - DynamoDB Scan doesn't guarantee order
                            allFetchedLogs.sort((a, b) => {
                                const timeA = new Date(a.timestamp || 0).getTime();
                                const timeB = new Date(b.timestamp || 0).getTime();
                                return timeB - timeA;
                            });
                            
                            // Filter logs: include if agent_id matches managed agents OR admin's own ID
                            fetchedLogs = allFetchedLogs.filter(l => {
                                const logAgentId = l.agent_id || l.user_id;
                                return logAgentId && allAgentIds.has(logAgentId);
                            });
                            
                            // Take first 10 for display
                            fetchedLogs = fetchedLogs.slice(0, 10);
                            
                            // If we filtered out all logs but there are more pages, we need to fetch more
                            // Keep fetching until we have 10 logs or run out of pages
                            let attempts = 0;
                            const maxAttempts = 5; // Limit to prevent infinite loops
                            while (fetchedLogs.length < 10 && responseHasMore && attempts < maxAttempts) {
                                attempts++;
                                const nextResponse = await auditApi.getLogsPaginated(50, responseNextToken, null, 24);
                                const nextLogs = nextResponse.data?.logs || [];
                                responseNextToken = nextResponse.data?.next_token || null;
                                responseHasMore = nextResponse.data?.has_more || false;
                                
                                const filteredNextLogs = nextLogs.filter(l => {
                                    const logAgentId = l.agent_id || l.user_id;
                                    return logAgentId && allAgentIds.has(logAgentId);
                                });
                                
                                fetchedLogs = [...fetchedLogs, ...filteredNextLogs].slice(0, 10);
                            }
                        } else {
                            // For other roles, use paginated endpoint (last 24 hours)
                            const response = await auditApi.getLogsPaginated(10, null, null, 24);
                            fetchedLogs = response.data?.logs || [];
                            responseNextToken = response.data?.next_token || null;
                            responseHasMore = response.data?.has_more || false;
                        }
                    } catch (e) {
                        // If fetch fails, fall back to empty for safety
                        console.error('Failed to fetch/filter logs:', e);
                        fetchedLogs = [];
                    }
                } else {
                    // Root admin: fetch all logs using paginated endpoint (last 24 hours, no filtering)
                    try {
                        const response = await auditApi.getLogsPaginated(100, null, null, 24);
                        let allFetchedLogs = response.data?.logs || response.data?.data || [];
                        responseNextToken = response.data?.next_token || null;
                        responseHasMore = response.data?.has_more || false;
                        
                        // Sort by timestamp descending (most recent first) to ensure we show latest logs
                        // DynamoDB Scan doesn't guarantee order
                        allFetchedLogs.sort((a, b) => {
                            const timeA = new Date(a.timestamp || 0).getTime();
                            const timeB = new Date(b.timestamp || 0).getTime();
                            return timeB - timeA;
                        });
                        
                        // Take first 10 most recent logs
                        fetchedLogs = allFetchedLogs.slice(0, 10);
                    } catch (e) {
                        console.error('Failed to fetch logs for root admin:', e);
                        fetchedLogs = [];
                        responseNextToken = null;
                        responseHasMore = false;
                    }
                }
                
                setLogs(fetchedLogs);
                setNextToken(responseNextToken);
                setHasMore(responseHasMore);
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

    const loadMoreLogs = async () => {
        if (loadingMore) return;
        
        // Check if we have a nextToken or if we can load more
        const current = await getUserFromToken();
        if (current && current.role !== 'rootAdministrator' && !nextToken) {
            return;
        }
        
        setLoadingMore(true);
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
            
            // Fetch more logs based on role (current already fetched above)
            let newLogs = [];
            let responseNextToken = null;
            let responseHasMore = false;
            
            if (current && current.role !== 'rootAdministrator') {
                try {
                    if (current.role === 'agent') {
                        // For agents: Use pagination if available (last 24 hours)
                        if (nextToken) {
                            const response = await auditApi.getLogsPaginated(10, nextToken, null, 24);
                            newLogs = response.data?.logs || [];
                            responseNextToken = response.data?.next_token || null;
                            responseHasMore = response.data?.has_more || false;
                            
                            // Filter by client IDs
                            const clientsResp = await clientApi.getAllClients(0, 100);
                            const pageData = clientsResp.data?.data;
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
                                newLogs = newLogs.filter(l => clientIds.includes(l.client_id));
                            } else {
                                newLogs = [];
                            }
                        } else {
                            // No pagination token, can't load more
                            newLogs = [];
                        }
                    } else if (current.role === 'admin') {
                        // For admins: Continue fetching with pagination and filter
                        if (!nextToken) {
                            newLogs = [];
                            responseHasMore = false;
                        } else {
                            const usersResp = await userApi.getAllUsers();
                            let users = [];
                            const pageData = usersResp.data?.data;
                            if (Array.isArray(pageData)) {
                                users = pageData;
                            } else if (pageData?.content) {
                                users = pageData.content;
                            }
                            const managedAgents = users
                                .filter(user => user.role === 'agent')
                                .map(user => user.id);
                            
                            const adminId = current.sub || current.userId;
                            const allAgentIds = new Set([...managedAgents]);
                            if (adminId) {
                                allAgentIds.add(adminId);
                            }
                            
                            // Fetch next page of logs (last 24 hours)
                            const response = await auditApi.getLogsPaginated(50, nextToken, null, 24);
                            let allNextLogs = response.data?.logs || [];
                            responseNextToken = response.data?.next_token || null;
                            responseHasMore = response.data?.has_more || false;
                            
                            // Sort by timestamp descending (most recent first) - DynamoDB Scan doesn't guarantee order
                            allNextLogs.sort((a, b) => {
                                const timeA = new Date(a.timestamp || 0).getTime();
                                const timeB = new Date(b.timestamp || 0).getTime();
                                return timeB - timeA;
                            });
                            
                            // Filter logs by managed agents
                            newLogs = allNextLogs.filter(l => {
                                const logAgentId = l.agent_id || l.user_id;
                                return logAgentId && allAgentIds.has(logAgentId);
                            });
                            
                            // Get logs after the ones we've already displayed
                            const existingLogIds = new Set(logs.map(l => l.log_id));
                            newLogs = newLogs.filter(l => !existingLogIds.has(l.log_id));
                            
                            // Take first 10
                            newLogs = newLogs.slice(0, 10);
                            
                            // If we don't have enough logs but there are more pages, fetch more
                            let attempts = 0;
                            const maxAttempts = 3;
                            while (newLogs.length < 10 && responseHasMore && attempts < maxAttempts) {
                                attempts++;
                                const nextResponse = await auditApi.getLogsPaginated(50, responseNextToken, null, 24);
                                const nextBatch = nextResponse.data?.logs || [];
                                responseNextToken = nextResponse.data?.next_token || null;
                                responseHasMore = nextResponse.data?.has_more || false;
                                
                                const filteredBatch = nextBatch.filter(l => {
                                    const logAgentId = l.agent_id || l.user_id;
                                    return logAgentId && allAgentIds.has(logAgentId) && !existingLogIds.has(l.log_id);
                                });
                                
                                newLogs = [...newLogs, ...filteredBatch].slice(0, 10);
                            }
                        }
                    } else {
                        // For other roles, use pagination (last 24 hours)
                        const response = await auditApi.getLogsPaginated(10, nextToken, null, 24);
                        newLogs = response.data?.logs || [];
                        responseNextToken = response.data?.next_token || null;
                        responseHasMore = response.data?.has_more || false;
                    }
                } catch (e) {
                    console.error('Failed to fetch/filter logs:', e);
                    newLogs = [];
                }
            } else {
                // Root admin: use pagination (last 24 hours, no filtering)
                try {
                    const response = await auditApi.getLogsPaginated(100, nextToken, null, 24);
                    let allNextLogs = response.data?.logs || [];
                    responseNextToken = response.data?.next_token || null;
                    responseHasMore = response.data?.has_more || false;
                    
                    // Sort by timestamp descending (most recent first)
                    allNextLogs.sort((a, b) => {
                        const timeA = new Date(a.timestamp || 0).getTime();
                        const timeB = new Date(b.timestamp || 0).getTime();
                        return timeB - timeA;
                    });
                    
                    // Get logs after the ones we've already displayed
                    const existingLogIds = new Set(logs.map(l => l.log_id));
                    newLogs = allNextLogs.filter(l => !existingLogIds.has(l.log_id));
                    
                    // Take first 10
                    newLogs = newLogs.slice(0, 10);
                } catch (e) {
                    console.error('Failed to fetch more logs for root admin:', e);
                    newLogs = [];
                    responseNextToken = null;
                    responseHasMore = false;
                }
            }

            // Append new logs to existing logs
            setLogs(prevLogs => [...prevLogs, ...newLogs]);
            setNextToken(responseNextToken);
            setHasMore(responseHasMore);

            // Fetch user/client names for new logs and merge with existing maps
            if (newLogs.length > 0) {
                const { userNameMap: newUserNameMap, clientNameMap: newClientNameMap } = await fetchNamesFromLogs(newLogs, jwt);
                setUserNameMap(prev => ({ ...prev, ...newUserNameMap }));
                setClientNameMap(prev => ({ ...prev, ...newClientNameMap }));
            }
        } catch (err) {
            console.error('Failed to load more logs:', err);
            setLogsError(err.response?.data?.message || err.message || 'Failed to load more activities');
        } finally {
            setLoadingMore(false);
        }
    };

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
                        <>
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
                            {hasMore && (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={loadMoreLogs}
                                        disabled={loadingMore}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loadingMore ? 'Loading...' : 'See More'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ...removed User Information tab... */}
                </main>
            </div>
        </div>
    );
}
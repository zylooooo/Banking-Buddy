import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { auditApi, userApi, clientApi } from '../services/apiService';
import axios from 'axios';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

// Helper to batch fetch agent and client names
async function fetchNamesFromLogs(logs, jwt) {
    // Collate unique agent IDs and client IDs
    const agentIds = Array.from(new Set(logs.map(l => l.agent_id).filter(Boolean)));
    const clientIds = Array.from(new Set(logs.map(l => l.client_id).filter(Boolean)));

    // Fetch agent names
    const agentNameMap = {};
    await Promise.all(agentIds.map(async (aid) => {
        try {
            const resp = await axios.get(`/api/users/${aid}`, {
                headers: { Authorization: `Bearer ${jwt}` }
            });
            const userData = resp.data?.data || {};
            let fullName = '';
            if (userData.firstName || userData.lastName) {
                fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
            }
            agentNameMap[aid] = fullName || userData.username || userData.name || aid;
        } catch {
            agentNameMap[aid] = aid;
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

    return { agentNameMap, clientNameMap };
}

export default function CommunicationPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [agentNameMap, setAgentNameMap] = useState({});
    const [clientNameMap, setClientNameMap] = useState({});
    const [nextToken, setNextToken] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }
                const cognitoUser = await getUserFromToken();
                setCurrentUser(cognitoUser);
                // Get JWT token directly from localStorage, matching user's sub value
                let jwt = '';
                if (cognitoUser && cognitoUser.sub) {
                    // Find all idToken keys for this user
                    const cognitoKeys = Object.keys(window.localStorage).filter(k => k.includes('CognitoIdentityServiceProvider') && k.includes(cognitoUser.sub) && k.endsWith('.idToken'));
                    // Use the last (most recent) one if multiple exist
                    if (cognitoKeys.length > 0) {
                        jwt = window.localStorage.getItem(cognitoKeys[cognitoKeys.length - 1]);
                    }
                }
                // Fetch first 10 logs using paginated endpoint with operation=UPDATE filter
                // Backend filters by operation, then we filter by attribute_name and after_value on frontend
                const response = await auditApi.getLogsPaginated(10, null, 'UPDATE');
                let fetchedLogs = response.data?.logs || [];
                const responseNextToken = response.data?.next_token || null;
                const responseHasMore = response.data?.has_more || false;
                
                // Filter logs for verification status update to Verified
                // Backend already filtered by operation=UPDATE, so we only need to filter by attribute and value
                let verificationLogs = fetchedLogs.filter(log => {
                    return log.attribute_name === 'Verification Status' &&
                        log.after_value === 'Verified';
                });
                
                // Filter logs based on role
                if (cognitoUser && cognitoUser.role !== 'rootAdministrator') {
                    try {
                        if (cognitoUser.role === 'agent') {
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
                                verificationLogs = verificationLogs.filter(l => clientIds.includes(l.client_id));
                            } else {
                                verificationLogs = [];
                            }
                        } else if (cognitoUser.role === 'admin') {
                            // For admins: Filter by agent IDs of agents they manage
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
                            
                            if (managedAgents.length > 0) {
                                verificationLogs = verificationLogs.filter(l => 
                                    l.agent_id && managedAgents.includes(l.agent_id)
                                );
                            } else {
                                verificationLogs = [];
                            }
                        }
                    } catch (e) {
                        console.error('Failed to filter communication logs by role:', e);
                        verificationLogs = [];
                    }
                }
                
                setLogs(verificationLogs);
                setNextToken(responseNextToken);
                setHasMore(responseHasMore);
                setLoading(false);

                // Fetch agent/client names for logs
                if (verificationLogs.length > 0) {
                    const { agentNameMap, clientNameMap } = await fetchNamesFromLogs(verificationLogs, jwt);
                    setAgentNameMap(agentNameMap);
                    setClientNameMap(clientNameMap);
                } else {
                    setAgentNameMap({});
                    setClientNameMap({});
                }
            } catch (err) {
                console.error('Failed to load logs:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load logs');
                setLoading(false);
            }
        };
        loadLogs();
    }, [navigate]);

    const loadMoreLogs = async () => {
        if (!nextToken || loadingMore) return;
        
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
            
            // Fetch next 10 logs using pagination token with operation=UPDATE filter
            // Backend filters by operation, then we filter by attribute_name and after_value on frontend
            const response = await auditApi.getLogsPaginated(10, nextToken, 'UPDATE');
            let newLogs = response.data?.logs || [];
            const responseNextToken = response.data?.next_token || null;
            const responseHasMore = response.data?.has_more || false;
            
            // Filter logs for verification status update to Verified
            // Backend already filtered by operation=UPDATE, so we only need to filter by attribute and value
            let verificationLogs = newLogs.filter(log => {
                return log.attribute_name === 'Verification Status' &&
                    log.after_value === 'Verified';
            });

            // Filter logs based on role (same logic as initial load)
            if (cognitoUser && cognitoUser.role !== 'rootAdministrator') {
                try {
                    if (cognitoUser.role === 'agent') {
                        // For agents: Filter by client IDs from their own clients
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
                            verificationLogs = verificationLogs.filter(l => clientIds.includes(l.client_id));
                        } else {
                            verificationLogs = [];
                        }
                    } else if (cognitoUser.role === 'admin') {
                        // For admins: Filter by agent IDs of agents they manage
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
                        if (managedAgents.length > 0) {
                            verificationLogs = verificationLogs.filter(l => 
                                l.agent_id && managedAgents.includes(l.agent_id)
                            );
                        } else {
                            verificationLogs = [];
                        }
                    }
                } catch (e) {
                    console.error('Failed to filter communication logs by role:', e);
                    verificationLogs = [];
                }
            }

            // Append new logs to existing logs
            setLogs(prevLogs => [...prevLogs, ...verificationLogs]);
            setNextToken(responseNextToken);
            setHasMore(responseHasMore);

            // Fetch agent/client names for new logs and merge with existing maps
            if (verificationLogs.length > 0) {
                const { agentNameMap: newAgentNameMap, clientNameMap: newClientNameMap } = await fetchNamesFromLogs(verificationLogs, jwt);
                setAgentNameMap(prev => ({ ...prev, ...newAgentNameMap }));
                setClientNameMap(prev => ({ ...prev, ...newClientNameMap }));
            }
        } catch (err) {
            console.error('Failed to load more logs:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load more logs');
        } finally {
            setLoadingMore(false);
        }
    };

    // All communicationApi and /communications API calls removed

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading audit logs...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Audit Logs: Client Verification</h2>
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
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                        <div className="overflow-x-auto">
                            {logs.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    No verification logs found.
                                </div>
                            ) : (
                                <>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-700">
                                                <th className="text-left p-4 text-slate-300 font-medium">Date/Time</th>
                                                <th className="text-left p-4 text-slate-300 font-medium">Client Name</th>
                                                <th className="text-left p-4 text-slate-300 font-medium">Agent Name</th>
                                                <th className="text-left p-4 text-slate-300 font-medium">Previous Status</th>
                                                <th className="text-left p-4 text-slate-300 font-medium">Current Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log, idx) => {
                                                const aid = log.agent_id;
                                                const cid = log.client_id;
                                                return (
                                                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-750">
                                                        <td className="p-4 text-slate-300 text-sm">
                                                            {log.timestamp ? new Date(log.timestamp).toLocaleString('en-SG') : ''}
                                                        </td>
                                                        <td className="p-4 text-slate-300">{cid ? clientNameMap[cid] || cid : '-'}</td>
                                                        <td className="p-4 text-slate-300">{aid ? agentNameMap[aid] || aid : '-'}</td>
                                                        <td className="p-4 text-slate-300">{log.before_value || '-'}</td>
                                                        <td className="p-4 text-slate-300">{log.after_value || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {hasMore && (
                                        <div className="mt-4 pb-4 flex justify-center">
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
                    </div>
                </main>
            </div>
        </div>
    );
}

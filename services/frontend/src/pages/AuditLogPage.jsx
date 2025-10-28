import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { auditApi, clientApi, userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

export default function AuditLogPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [clients, setClients] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        clientId: '',
        agentId: '',
        operation: '',
        dateFrom: '',
        dateTo: '',
        attribute: ''
    });
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

                // Load reference data for filters
                const [clientsResponse, usersResponse] = await Promise.all([
                    clientApi.getAllClients(),
                    userApi.getAllUsers()
                ]);

                setClients(clientsResponse.data.data || []);
                setAgents(usersResponse.data.data?.filter(user => user.role === 'agent') || []);

                // Load audit logs
                await loadLogs();
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const loadLogs = async () => {
        try {
            let response;
            if (currentUser?.role === 'agent') {
                // Agents can only see their own logs
                response = await auditApi.getLogsByAgentId(currentUser.sub);
            } else {
                // Admins can see all logs with filters
                response = await auditApi.getAllLogs(filters);
            }
            setLogs(response.data.data || []);
        } catch (err) {
            setError('Failed to load audit logs');
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleApplyFilters = () => {
        loadLogs();
    };

    const handleClearFilters = () => {
        setFilters({
            clientId: '',
            agentId: '',
            operation: '',
            dateFrom: '',
            dateTo: '',
            attribute: ''
        });
        loadLogs();
    };

    const getOperationColor = (operation) => {
        switch (operation?.toUpperCase()) {
            case 'CREATE':
                return 'bg-green-900 text-green-300';
            case 'UPDATE':
                return 'bg-yellow-900 text-yellow-300';
            case 'DELETE':
                return 'bg-red-900 text-red-300';
            case 'READ':
                return 'bg-blue-900 text-blue-300';
            default:
                return 'bg-slate-900 text-slate-300';
        }
    };

    const formatDateTime = (dateTime) => {
        return new Date(dateTime).toLocaleString('en-SG', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getClientName = (clientId) => {
        const client = clients.find(c => c.clientId === clientId);
        return client ? `${client.firstName} ${client.lastName}` : clientId;
    };

    const getAgentName = (agentId) => {
        const agent = agents.find(a => a.userId === agentId);
        return agent ? `${agent.firstName} ${agent.lastName}` : agentId;
    };

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
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Audit Log Management</h2>
                    <p className="text-slate-400">
                        Track all agent interactions and client communications
                        {currentUser?.role === 'AGENT' && ' (Your activity only)'}
                    </p>
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

                {/* Filters - Only show for admin users */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'rootAdministrator') && (
                    <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Filter Logs</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Client
                                </label>
                                <select
                                    value={filters.clientId}
                                    onChange={(e) => handleFilterChange('clientId', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Clients</option>
                                    {clients.map(client => (
                                        <option key={client.clientId} value={client.clientId}>
                                            {client.firstName} {client.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Agent
                                </label>
                                <select
                                    value={filters.agentId}
                                    onChange={(e) => handleFilterChange('agentId', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Agents</option>
                                    {agents.map(agent => (
                                        <option key={agent.userId} value={agent.userId}>
                                            {agent.firstName} {agent.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Operation
                                </label>
                                <select
                                    value={filters.operation}
                                    onChange={(e) => handleFilterChange('operation', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Operations</option>
                                    <option value="CREATE">Create</option>
                                    <option value="READ">Read</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Date From
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Date To
                                </label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Attribute
                                </label>
                                <input
                                    type="text"
                                    value={filters.attribute}
                                    onChange={(e) => handleFilterChange('attribute', e.target.value)}
                                    placeholder="e.g., First Name, Address"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleApplyFilters}
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={handleClearFilters}
                                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Audit Logs Table */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-medium">Date/Time</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Operation</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Client</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Agent</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Attribute</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Before</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">After</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center p-8 text-slate-400">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log, index) => (
                                        <tr key={index} className="border-b border-slate-700 hover:bg-slate-750">
                                            <td className="p-4 text-slate-300 text-sm">
                                                {formatDateTime(log.dateTime)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getOperationColor(log.operation)}`}>
                                                    {log.operation}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {getClientName(log.clientId)}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {getAgentName(log.agentId)}
                                            </td>
                                            <td className="p-4 text-white">
                                                {log.attributeName}
                                            </td>
                                            <td className="p-4 text-slate-300 max-w-xs truncate">
                                                {log.beforeValue || '-'}
                                            </td>
                                            <td className="p-4 text-slate-300 max-w-xs truncate">
                                                {log.afterValue || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Statistics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-slate-400 text-sm font-medium">Total Logs</h4>
                        <p className="text-2xl font-bold text-white">{logs.length}</p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-slate-400 text-sm font-medium">Creates</h4>
                        <p className="text-2xl font-bold text-green-400">
                            {logs.filter(log => log.operation === 'CREATE').length}
                        </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-slate-400 text-sm font-medium">Updates</h4>
                        <p className="text-2xl font-bold text-yellow-400">
                            {logs.filter(log => log.operation === 'UPDATE').length}
                        </p>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <h4 className="text-slate-400 text-sm font-medium">Deletes</h4>
                        <p className="text-2xl font-bold text-red-400">
                            {logs.filter(log => log.operation === 'DELETE').length}
                        </p>
                    </div>
                </div>
                </main>
            </div>
        </div>
    );
}
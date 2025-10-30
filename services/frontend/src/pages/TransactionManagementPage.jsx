import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { transactionApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

import { clientApi } from '../services/apiService';

export default function TransactionManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        clientId: '',
        transactionType: '',
        status: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: ''
    });
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null);
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

                // Fetch clients for filter dropdown
                // For AGENT users, this will get their clients
                let fetchedClients = [];
                try {
                    const clientsResponse = await clientApi.getAllClients(); // defaults page=0, limit=10
                    const payload = clientsResponse?.data?.data;
                    fetchedClients = Array.isArray(payload)
                        ? payload
                        : (Array.isArray(payload?.content) ? payload.content : []);
                    setClients(fetchedClients);
                } catch (err) {
                    // If getAllClients fails (e.g., non-AGENT user), set empty array
                    setClients([]);
                }

                // Load transactions - pass clients directly to avoid state timing issue
                await loadTransactions(cognitoUser, fetchedClients);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);


    // Always use /api/transactions/search endpoint for loading transactions
    const loadTransactions = async (user = currentUser, clientsData = clients) => {
        try {
            setError(null); // Clear any previous errors

            // Check role case-insensitively (Cognito might return 'agent' or 'AGENT')
            const userRole = user?.role?.toUpperCase();

            // For AGENT users: get all transactions from their clients
            if (userRole === 'AGENT') {
                // Use clients passed as parameter or from state (parameter takes precedence)
                const clientsToUse = clientsData || clients || [];

                // Filter valid clients - check multiple possible field names
                const agentClients = clientsToUse.filter(client => {
                    // Check for clientId (from ClientSummaryDTO) or id (alternative)
                    const id = client?.clientId || client?.id;
                    return id && typeof id === 'string' && id.trim() !== '';
                });

                // If agent has no clients, show empty state (not an error)
                if (agentClients.length === 0) {
                    setTransactions([]);
                    setError(null); // Ensure no error is shown
                    return; // No API call made
                }

                // Extract clientIds from the agent's clients - handle both clientId and id
                const clientIds = agentClients.map(client => client.clientId || client.id).filter(Boolean);

                // Safety check: ensure we have at least one clientId before making API call
                if (!clientIds || clientIds.length === 0) {
                    setTransactions([]);
                    setError(null);
                    return;
                }

                // Build search params - only include clientIds and valid filter values
                const searchParams = {
                    clientIds: clientIds, // Non-empty array - ensures validation passes
                    // Only include other filters if they have meaningful values
                    ...(filters.transactionType && { transaction: filters.transactionType }),
                    ...(filters.status && { status: filters.status }),
                    ...(filters.dateFrom && { startDate: filters.dateFrom }),
                    ...(filters.dateTo && { endDate: filters.dateTo }),
                    ...(filters.minAmount && parseFloat(filters.minAmount) > 0 && { minAmount: filters.minAmount }),
                    ...(filters.maxAmount && parseFloat(filters.maxAmount) > 0 && { maxAmount: filters.maxAmount }),
                };

                // Call the search endpoint with the constructed parameters
                const response = await transactionApi.searchTransactions(searchParams);
                setTransactions(response.data.data?.content || []);

            } else {
                // For non-AGENT users (admin, rootAdministrator)
                // Build search params with only non-empty filter values
                const searchParams = {};

                // Add filters only if they have values
                if (filters.clientId) {
                    searchParams.clientId = filters.clientId;
                }
                if (filters.transactionType) {
                    searchParams.transaction = filters.transactionType;
                }
                if (filters.status) {
                    searchParams.status = filters.status;
                }
                if (filters.dateFrom) {
                    searchParams.startDate = filters.dateFrom;
                }
                if (filters.dateTo) {
                    searchParams.endDate = filters.dateTo;
                }
                if (filters.minAmount && parseFloat(filters.minAmount) > 0) {
                    searchParams.minAmount = filters.minAmount;
                }
                if (filters.maxAmount && parseFloat(filters.maxAmount) > 0) {
                    searchParams.maxAmount = filters.maxAmount;
                }

                // Backend requires at least one filter - don't call if none are set
                const hasAtLeastOneFilter = Object.keys(searchParams).length > 0;

                if (!hasAtLeastOneFilter) {
                    // For non-AGENT users with no filters, show empty state
                    setTransactions([]);
                    setError(null); // Don't show error, just empty state
                    return;
                }

                // Call the search endpoint
                const response = await transactionApi.searchTransactions(searchParams);
                setTransactions(response.data.data?.content || []);
            }
        } catch (err) {
            console.error('Failed to load transactions:', err);
            // Show user-friendly error message
            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to load transactions';
            setError(errorMessage);
            setTransactions([]); // Clear transactions on error
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleApplyFilters = () => {
        loadTransactions();
    };

    const handleClearFilters = () => {
        setFilters({
            clientId: '',
            transactionType: '',
            status: '',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: ''
        });
        loadTransactions();
    };

    const handleSyncFromSFTP = async () => {
        try {
            setSyncStatus('syncing');
            const response = await transactionApi.syncFromSFTP();
            setSyncStatus('success');
            setShowSyncModal(false);
            // Refresh transactions after sync
            await loadTransactions();
            alert('Transactions synced successfully from SFTP server');
        } catch (err) {
            setSyncStatus('error');
            setError('Failed to sync transactions from SFTP server');
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED':
                return 'bg-green-900 text-green-300';
            case 'PENDING':
                return 'bg-yellow-900 text-yellow-300';
            case 'FAILED':
                return 'bg-red-900 text-red-300';
            default:
                return 'bg-slate-900 text-slate-300';
        }
    };

    const getTypeColor = (type) => {
        return type === 'D' ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading transactions...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Transaction Management</h2>
                            <p className="text-slate-400">View and manage bank account transactions</p>
                        </div>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'rootAdministrator') && (
                            <button
                                onClick={() => setShowSyncModal(true)}
                                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-sky-600 transition"
                            >
                                Sync from SFTP
                            </button>
                        )}
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

                    {/* Filters */}
                    <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Filter Transactions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                            {client.clientId} {client.firstName ? `- ${client.firstName} ${client.lastName}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Type
                                </label>
                                <select
                                    value={filters.transactionType}
                                    onChange={(e) => handleFilterChange('transactionType', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Types</option>
                                    <option value="D">Deposit</option>
                                    <option value="W">Withdrawal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Status
                                </label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="FAILED">Failed</option>
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
                                    Min Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={filters.minAmount}
                                    onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Max Amount
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={filters.maxAmount}
                                    onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex items-end">
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={handleApplyFilters}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition flex-1"
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={handleClearFilters}
                                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition flex-1"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="text-left p-4 text-slate-300 font-medium">Transaction ID</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Client</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Amount</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Date</th>
                                        <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center p-8 text-slate-400">
                                                No transactions found.
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map((transaction) => (
                                            <tr key={transaction.id} className="border-b border-slate-700 hover:bg-slate-750">
                                                <td className="p-4 text-white font-mono text-sm">
                                                    {transaction.id}
                                                </td>
                                                <td className="p-4 text-slate-300">
                                                    {transaction.clientId}
                                                    {transaction.clientName ? ` - ${transaction.clientName}` : ''}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(transaction.transaction)}`}>
                                                        {transaction.transaction === 'D' ? 'Deposit' : 'Withdrawal'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-white font-semibold">
                                                    {formatCurrency(transaction.amount)}
                                                </td>
                                                <td className="p-4 text-slate-300">
                                                    {new Date(transaction.date).toLocaleDateString('en-SG')}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                                                        {transaction.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SFTP Sync Modal */}
                    {showSyncModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-lg font-semibold text-white mb-4">Sync Transactions from SFTP</h3>
                                <p className="text-slate-300 mb-6">
                                    This will fetch the latest transaction data from the SFTP server and update the local database.
                                    This operation may take a few minutes.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSyncFromSFTP}
                                        disabled={syncStatus === 'syncing'}
                                        className="px-4 py-2 bg-accent text-white rounded-md hover:bg-sky-600 transition disabled:opacity-50"
                                    >
                                        {syncStatus === 'syncing' ? 'Syncing...' : 'Start Sync'}
                                    </button>
                                    <button
                                        onClick={() => setShowSyncModal(false)}
                                        disabled={syncStatus === 'syncing'}
                                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { transactionApi, clientApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

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

                // Load clients for filter dropdown
                const clientsResponse = await clientApi.getAllClients();
                setClients(clientsResponse.data.data || []);

                // Load transactions
                await loadTransactions();
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const loadTransactions = async () => {
        try {
            const response = await transactionApi.getAllTransactions(filters);
            setTransactions(response.data.data || []);
        } catch (err) {
            setError('Failed to load transactions');
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
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'ROOT_ADMIN') && (
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
                                        {client.firstName} {client.lastName}
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
                                                {transaction.clientName || `Client ${transaction.clientId}`}
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
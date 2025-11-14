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
    // Pagination state
    const [page, setPage] = useState(0);
    const LIMIT = 10;
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
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
                    console.error('Failed to fetch clients for filter:', err);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);
    
    // Reload transactions when page changes
    useEffect(() => {
        if (currentUser) {
            loadTransactions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);


    /**
     * Load transactions for the authenticated agent.
     * 
     * This page is only accessible to agents (enforced by route authorization).
     * 
     * Caching Strategy:
     * - When no filters applied: Backend caches the result (high hit rate)
     * - When filters applied: Backend queries database (no cache)
     */
    const loadTransactions = async (user = currentUser, clientsData = clients) => {
        try {
            setError(null);

            // Use clients passed as parameter or from state
            const clientsToUse = clientsData || clients || [];

            // Extract valid client IDs
            const allClientIds = clientsToUse
                .map(client => client.clientId || client.id)
                .filter(id => id && typeof id === 'string' && id.trim() !== '');

            // If agent has no clients, show empty state
            if (allClientIds.length === 0) {
                setTransactions([]);
                setTotalPages(0);
                setTotalElements(0);
                setError(null);
                return;
            }

            // Filter by specific client if selected, otherwise use all client IDs
            const clientIds = filters.clientId 
                ? [filters.clientId] 
                : allClientIds;

            // Build search params
            const searchParams = {
                clientIds: clientIds,
                page: page,
                limit: LIMIT,
                // Include filters only if they have values
                ...(filters.transactionType && { transaction: filters.transactionType }),
                ...(filters.status && { status: filters.status }),
                // Convert date strings to ISO datetime format (LocalDateTime)
                ...(filters.dateFrom && { startDate: `${filters.dateFrom}T00:00:00` }),
                ...(filters.dateTo && { endDate: `${filters.dateTo}T23:59:59` }),
                ...(filters.minAmount && parseFloat(filters.minAmount) > 0 && { minAmount: filters.minAmount }),
                ...(filters.maxAmount && parseFloat(filters.maxAmount) > 0 && { maxAmount: filters.maxAmount }),
            };

            // Call search endpoint (backend handles caching intelligently)
            const response = await transactionApi.searchTransactions(searchParams);
            const pageData = response.data.data;
            
            setTransactions(pageData?.content || []);
            setTotalPages(pageData?.totalPages || 0);
            setTotalElements(pageData?.totalElements || 0);

        } catch (err) {
            console.error(`Failed to load transactions called by user ${user?.userId}:`, err);
            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to load transactions';
            setError(errorMessage);
            setTransactions([]);
            setTotalPages(0);
            setTotalElements(0);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleApplyFilters = () => {
        setPage(0); // Reset to first page when applying filters
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
        setPage(0); // Reset to first page when clearing filters
        loadTransactions();
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
        // Handle both enum constant names (DEPOSIT/WITHDRAWAL) and value strings (Deposit/Withdrawal)
        return (type === 'Deposit' || type === 'DEPOSIT') ? 'bg-green-900 text-green-300' : 'bg-blue-900 text-blue-300';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD'
        }).format(amount);
    };

    // Generate page numbers to display in pagination
    const getPageNumbers = () => {
        const currentPage = page + 1; // Convert 0-indexed to 1-indexed
        const total = Math.max(totalPages, 1);
        const pages = [];

        if (total <= 7) {
            // Show all pages if 7 or fewer
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            // Calculate range around current page
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(total - 1, currentPage + 1);

            // Adjust if we're near the start
            if (currentPage <= 3) {
                end = Math.min(4, total - 1);
            }

            // Adjust if we're near the end
            if (currentPage >= total - 2) {
                start = Math.max(2, total - 3);
            }

            // Add ellipsis after first page if needed
            if (start > 2) {
                pages.push('...');
            }

            // Add pages in range
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis before last page if needed
            if (end < total - 1) {
                pages.push('...');
            }

            // Always show last page
            pages.push(total);
        }

        return pages;
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
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white">Transaction Management</h2>
                        <p className="text-slate-400">View and filter your clients' transactions</p>
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
                                    <option value="DEPOSIT">Deposit</option>
                                    <option value="WITHDRAWAL">Withdrawal</option>
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
                                                        {(transaction.transaction === 'Deposit' || transaction.transaction === 'DEPOSIT') ? 'Deposit' : 'Withdrawal'}
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
                        <div className="flex items-center justify-between p-4 border-t border-slate-700">
                            <div className="text-slate-400 text-sm">
                                Showing page {page + 1} of {Math.max(totalPages, 1)} ({totalElements} total)
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                                    disabled={page === 0}
                                    className={`px-3 py-1 text-sm rounded ${page === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
                                >
                                    Previous
                                </button>
                                {getPageNumbers().map((pageNum, idx) => {
                                    if (pageNum === '...') {
                                        return (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                                                ...
                                            </span>
                                        );
                                    }
                                    const pageIndex = pageNum - 1; // Convert to 0-indexed
                                    const isActive = page === pageIndex;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageIndex)}
                                            className={`px-3 py-1 text-sm rounded ${
                                                isActive
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : 'bg-slate-600 text-white hover:bg-slate-500'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage((p) => Math.min(p + 1, Math.max(totalPages - 1, 0)))}
                                    disabled={page >= totalPages - 1}
                                    className={`px-3 py-1 text-sm rounded ${page >= totalPages - 1 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
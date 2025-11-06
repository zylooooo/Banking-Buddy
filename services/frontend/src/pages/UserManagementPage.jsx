import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { formatRole } from '../utils/roleLabels';

export default function UserManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]); // Store all users for client-side pagination
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    // Pagination state
    const [page, setPage] = useState(0);
    const LIMIT = 10;
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

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

                // Data load by role (agents can manage only themselves)
                if (cognitoUser?.role === 'agent') {
                    const response = await userApi.getUserById(cognitoUser.sub);
                    setUsers([response.data.data]);
                    setLoading(false);
                    return;
                }

                if (!['admin', 'rootAdministrator'].includes(cognitoUser.role)) {
                    setError('Access denied.');
                    setLoading(false);
                    return;
                }

                // Load users (scope enforced by backend) with pagination
                const response = await userApi.getAllUsers(page, LIMIT);
                const pageData = response.data.data;
                // Handle both paginated response (Page object) and list response (backward compatibility)
                if (Array.isArray(pageData)) {
                    // Backward compatibility: if backend returns list, store all and paginate client-side
                    setAllUsers(pageData);
                    const startIndex = page * LIMIT;
                    const endIndex = startIndex + LIMIT;
                    setUsers(pageData.slice(startIndex, endIndex));
                    setTotalPages(Math.ceil(pageData.length / LIMIT));
                    setTotalElements(pageData.length);
                } else {
                    // Paginated response from backend
                    setAllUsers([]); // Clear allUsers when using server-side pagination
                    setUsers(pageData?.content || []);
                    setTotalPages(pageData?.totalPages || 0);
                    setTotalElements(pageData?.totalElements || 0);
                }
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

    // Handle client-side pagination when allUsers is set
    useEffect(() => {
        if (allUsers.length > 0) {
            const startIndex = page * LIMIT;
            const endIndex = startIndex + LIMIT;
            setUsers(allUsers.slice(startIndex, endIndex));
        }
    }, [page, allUsers]);

    // Open create user form if navigation state is set, and clear state after opening (match ClientManagementPage pattern)
    useEffect(() => {
        if (location.state && location.state.openCreateForm) {
            setShowCreateForm(true);
            // Clear navigation state so it doesn't persist on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleCreateUser = async (userData) => {
        try {
            await userApi.createUser(userData);
            // Refresh users list with current pagination
            const response = await userApi.getAllUsers(page, LIMIT);
            const pageData = response.data.data;
            if (Array.isArray(pageData)) {
                setAllUsers(pageData);
                const startIndex = page * LIMIT;
                const endIndex = startIndex + LIMIT;
                setUsers(pageData.slice(startIndex, endIndex));
                setTotalPages(Math.ceil(pageData.length / LIMIT));
                setTotalElements(pageData.length);
            } else {
                setAllUsers([]);
                setUsers(pageData?.content || []);
                setTotalPages(pageData?.totalPages || 0);
                setTotalElements(pageData?.totalElements || 0);
            }
            setShowCreateForm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        }
    };

    const handleDisableUser = async (userId) => {
        if (window.confirm('Are you sure you want to disable this user?')) {
            try {
                await userApi.disableUser(userId);
                // Refresh users list with current pagination
                const response = await userApi.getAllUsers(page, LIMIT);
                const pageData = response.data.data;
                if (Array.isArray(pageData)) {
                    setAllUsers(pageData);
                    const startIndex = page * LIMIT;
                    const endIndex = startIndex + LIMIT;
                    setUsers(pageData.slice(startIndex, endIndex));
                    setTotalPages(Math.ceil(pageData.length / LIMIT));
                    setTotalElements(pageData.length);
                } else {
                    setAllUsers([]);
                    setUsers(pageData?.content || []);
                    setTotalPages(pageData?.totalPages || 0);
                    setTotalElements(pageData?.totalElements || 0);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to disable user');
            }
        }
    };

    const handleEnableUser = async (userId) => {
        try {
            await userApi.enableUser(userId);
            // Refresh users list with current pagination
            const response = await userApi.getAllUsers(page, LIMIT);
            const pageData = response.data.data;
            if (Array.isArray(pageData)) {
                setAllUsers(pageData);
                const startIndex = page * LIMIT;
                const endIndex = startIndex + LIMIT;
                setUsers(pageData.slice(startIndex, endIndex));
                setTotalPages(Math.ceil(pageData.length / LIMIT));
                setTotalElements(pageData.length);
            } else {
                setAllUsers([]);
                setUsers(pageData?.content || []);
                setTotalPages(pageData?.totalPages || 0);
                setTotalElements(pageData?.totalElements || 0);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to enable user');
        }
    };

    // Reset Password and MFA setup actions removed from UI per new requirements

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

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">User Management</h2>
                        <p className="text-slate-400">Manage system users and their permissions</p>
                    </div>
                        {(currentUser?.role === 'rootAdministrator' || currentUser?.role === 'admin') && (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                        >
                            Create New User
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

                {showCreateForm && (currentUser?.role === 'rootAdministrator' || currentUser?.role === 'admin') && (
                    <CreateUserForm
                        onSubmit={handleCreateUser}
                        onCancel={() => setShowCreateForm(false)}
                    />
                )}

                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-medium">Name</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Email</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Role</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Created</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-8 text-slate-400">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-750">
                                                    <td className="p-4 text-white">
                                                        {user.firstName} {user.lastName}
                                                    </td>
                                                    <td className="p-4 text-slate-300">{user.email}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            user.role === 'rootAdministrator'
                                                                ? 'bg-purple-900 text-purple-300'
                                                                : user.role === 'admin'
                                                                ? 'bg-blue-900 text-blue-300'
                                                                : 'bg-slate-700 text-slate-300'
                                                        }`}>
                                                            {formatRole(user.role)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                                            user.status === 'ACTIVE'
                                                                ? 'bg-green-900 text-green-300'
                                                                : 'bg-red-900 text-red-300'
                                                        }`}>
                                                            {user.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-300">
                                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="p-4">
                                                        {(() => {
                                                            const canToggle =
                                                                currentUser?.role === 'rootAdministrator' ||
                                                                (currentUser?.role === 'admin' && user.role === 'agent') ||
                                                                (currentUser?.role === 'agent' && user.id === currentUser?.sub);

                                                            if (!canToggle) return null;

                                                            const preventSelfForNonAgents =
                                                                currentUser?.role !== 'agent' && user.id === currentUser?.sub;

                                                            return user.status === 'ACTIVE' ? (
                                                                <button
                                                                    onClick={() => handleDisableUser(user.id)}
                                                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                                    disabled={preventSelfForNonAgents}
                                                                >
                                                                    Disable
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleEnableUser(user.id)}
                                                                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                                >
                                                                    Enable
                                                                </button>
                                                            );
                                                        })()}
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

function CreateUserForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
    role: 'agent'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New User</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        First Name *
                    </label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Last Name *
                    </label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Email *
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Role *
                    </label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="md:col-span-2 flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Create User
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
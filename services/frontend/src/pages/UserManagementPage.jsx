import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

export default function UserManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
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
                if (!cognitoUser || !['ADMIN', 'ROOT_ADMIN', 'rootAdministrator'].includes(cognitoUser.role)) {
                    setError('Access denied. Admin privileges required.');
                    setLoading(false);
                    return;
                }

                // Load users
                const response = await userApi.getAllUsers();
                setUsers(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handleCreateUser = async (userData) => {
        try {
            await userApi.createUser(userData);
            // Refresh users list
            const response = await userApi.getAllUsers();
            setUsers(response.data.data);
            setShowCreateForm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        }
    };

    const handleDisableUser = async (userId) => {
        if (window.confirm('Are you sure you want to disable this user?')) {
            try {
                await userApi.disableUser(userId);
                // Refresh users list
                const response = await userApi.getAllUsers();
                setUsers(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to disable user');
            }
        }
    };

    const handleEnableUser = async (userId) => {
        try {
            await userApi.enableUser(userId);
            // Refresh users list
            const response = await userApi.getAllUsers();
            setUsers(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to enable user');
        }
    };

    const handleResetPassword = async (userId) => {
        if (window.confirm('Are you sure you want to reset this user\'s password?')) {
            try {
                await userApi.resetPassword(userId);
                alert('Password reset email sent successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to reset password');
            }
        }
    };

    const handleSetupMFA = async (userId) => {
        try {
            await userApi.setUpMFAForUser(userId);
            alert('MFA setup initiated for user');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to setup MFA');
        }
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
                    {(currentUser?.role === 'ROOT_ADMIN' || currentUser?.role === 'rootAdministrator') && (
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

                {showCreateForm && (currentUser?.role === 'ROOT_ADMIN' || currentUser?.role === 'rootAdministrator') && (
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
                                                            user.role === 'ROOT_ADMIN' || user.role === 'rootAdministrator'
                                                                ? 'bg-purple-900 text-purple-300'
                                                                : user.role === 'ADMIN'
                                                                ? 'bg-blue-900 text-blue-300'
                                                                : 'bg-slate-700 text-slate-300'
                                                        }`}>
                                                            {user.role}
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
                                                        <div className="flex gap-2 flex-wrap">
                                                            {user.status === 'ACTIVE' ? (
                                                                <button
                                                                    onClick={() => handleDisableUser(user.id)}
                                                                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                                    disabled={user.id === currentUser?.sub}
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
                                                            )}
                                                            <button
                                                                onClick={() => handleResetPassword(user.id)}
                                                                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
                                                                disabled={user.id === currentUser?.sub}
                                                            >
                                                                Reset Password
                                                            </button>
                                                            <button
                                                                onClick={() => handleSetupMFA(user.id)}
                                                                className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-sky-600 transition"
                                                            >
                                                                Setup MFA
                                                            </button>
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

function CreateUserForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'AGENT'
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
                        <option value="AGENT">Agent</option>
                        <option value="ADMIN">Admin</option>
                        <option value="ROOT_ADMIN">Root Admin</option>
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
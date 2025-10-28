import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import UserCard from '../components/UserCard';
import ApiTester from '../components/ApiTester';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Link
                        to="/clients"
                        className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors group"
                    >
                        <div className="flex items-center mb-4">
                            <div className="p-3 bg-blue-900 rounded-lg group-hover:bg-blue-800 transition-colors">
                                <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="ml-4 text-lg font-semibold text-white">Client Management</h3>
                        </div>
                        <p className="text-slate-400 text-sm">Manage client profiles, verify identities, and create accounts</p>
                    </Link>

                    {['admin', 'rootAdministrator'].includes(user.role) && (
                        <>
                            <Link
                                to="/users"
                                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-green-900 rounded-lg group-hover:bg-green-800 transition-colors">
                                        <svg className="w-6 h-6 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">User Management</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Create and manage system users and their permissions</p>
                            </Link>

                            <Link
                                to="/accounts"
                                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:bg-slate-750 transition-colors group"
                            >
                                <div className="flex items-center mb-4">
                                    <div className="p-3 bg-purple-900 rounded-lg group-hover:bg-purple-800 transition-colors">
                                        <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="ml-4 text-lg font-semibold text-white">Account Overview</h3>
                                </div>
                                <p className="text-slate-400 text-sm">Monitor all client accounts and account statistics</p>
                            </Link>
                        </>
                    )}
                </div>

                {/* User Profile and API Testing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UserCard user={user} />
                    <ApiTester />
                </div>
                </main>
            </div>
        </div>
    );
}
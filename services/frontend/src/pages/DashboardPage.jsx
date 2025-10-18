import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import Header from '../components/Header';
import UserCard from '../components/UserCard';
import ApiTester from '../components/ApiTester';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUser = async () => {
            const isAuth = await isAuthenticated();
            if (!isAuth) {
                navigate('/');
                return;
            }

            const userData = await getUserFromToken();
            setUser(userData);
            setLoading(false);
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

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-900">
            <Header user={user} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    <p className="text-slate-400">Test your integration with user-service APIs</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <UserCard user={user} />
                    <ApiTester />
                </div>
            </main>
        </div>
    );
}
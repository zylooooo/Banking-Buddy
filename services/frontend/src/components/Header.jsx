import React from 'react';
import { logout } from '../services/authService';

export default function Header({ user }) {
    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">Dashboard</h1>
                        <p className="text-sm text-slate-400">Welcome to Banking Buddy CRM System</p>
                    </div>
                    {user && (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-slate-400">{user.role}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Banking Buddy CRM</h1>
                        <p className="text-xs sm:text-sm text-slate-400">Customer Relationship Management System</p>
                    </div>
                    {user && (
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                                <p className="text-sm font-medium text-white">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-slate-400">{user.role}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition whitespace-nowrap"
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
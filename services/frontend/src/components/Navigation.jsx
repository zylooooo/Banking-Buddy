import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatRole } from '../utils/roleLabels';

export default function Navigation({ user }) {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const navItems = [
        {
            path: '/dashboard',
            label: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v10" />
                </svg>
            ),
                roles: ['admin', 'rootAdministrator', 'agent']
        },
        {
            path: '/clients',
            label: 'Client Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
                roles: ['agent']
        },
        {
            path: '/transactions',
            label: 'Transactions',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
            ),
                roles: ['agent']
        },
        {
            path: '/communications',
            label: 'Communications',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
                roles: ['admin', 'rootAdministrator', 'agent']
        },
        {
            path: '/users',
            label: 'User Management',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
            ),
                roles: ['rootAdministrator', 'admin']
        },
        // ...existing code...
    ];

    const availableNavItems = navItems.filter(item => {
        if (!user) return false;
        return item.roles.includes(user.role);
    });

    return (
        <nav className="fixed left-0 top-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-40 overflow-y-auto">
            <div className="p-4 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">Banking Buddy</h1>
                <p className="text-sm text-slate-400">CRM System</p>
            </div>
            
            <div className="p-4">
                <nav className="space-y-2">
                    {availableNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 py-3 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                                isActive(item.path)
                                    ? 'bg-primary text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>
            
            {/* User info at bottom */}
            {user && (
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{formatRole(user.role)}</p>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
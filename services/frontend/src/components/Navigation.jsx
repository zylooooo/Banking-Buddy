import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatRole } from '../utils/roleLabels';
import {
    DashboardIcon,
    ClientManagementIcon,
    TransactionsIcon,
    CommunicationsIcon,
    UserManagementIcon,
    AiFeaturesIcon
} from './Icons';

export default function Navigation({ user }) {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const navItems = [
        {
            path: '/dashboard',
            label: 'Dashboard',
            icon: <DashboardIcon />,
            roles: ['admin', 'rootAdministrator', 'agent']
        },
        {
            path: '/clients',
            label: 'Client Management',
            icon: <ClientManagementIcon />,
            roles: ['agent']
        },
        {
            path: '/transactions',
            label: 'Transactions',
            icon: <TransactionsIcon />,
            roles: ['agent']
        },
        {
            path: '/communications',
            label: 'Communications',
            icon: <CommunicationsIcon />,
            roles: ['admin', 'rootAdministrator', 'agent']
        },
        {
            path: '/users',
            label: 'User Management',
            icon: <UserManagementIcon />,
            roles: ['rootAdministrator', 'admin']
        },
        {
            path: '/ai-features',
            label: 'AI Features',
            icon: <AiFeaturesIcon />,
            roles: ['rootAdministrator', 'admin', 'agent']
        }
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
import React from 'react';
import { formatRole } from '../utils/roleLabels';

export default function UserCard({ user }) {
    const roleColors = {
        ROOT_ADMIN: 'bg-purple-900/50 text-purple-300 border border-purple-700',
        ADMIN: 'bg-blue-900/50 text-blue-300 border border-blue-700',
        AGENT: 'bg-green-900/50 text-green-300 border border-green-700',
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">User Information</h2>
            <div className="space-y-3">
                <div>
                    <label className="text-sm font-medium text-slate-400">Name</label>
                    <p className="text-white">{user.firstName} {user.lastName}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Email</label>
                    <p className="text-white">{user.email}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">User ID</label>
                    <p className="text-slate-300 text-xs font-mono break-all">{user.sub}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Role</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${roleColors[user.role] || 'bg-slate-700 text-slate-300 border border-slate-600'}`}>
                        {formatRole(user.role)}
                    </span>
                </div>
            </div>
        </div>
    );
}
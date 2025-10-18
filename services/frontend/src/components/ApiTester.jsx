import React, { useState } from 'react';
import { userApi } from '../services/apiService';

export default function ApiTester() {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const testGetAllUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await userApi.getAllUsers();
            setResponse(res.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">API Testing</h2>
            <div className="space-y-4">
                <button
                    onClick={testGetAllUsers}
                    disabled={loading}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition"
                >
                    {loading ? 'Loading...' : 'Test GET /api/users'}
                </button>

                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700 rounded-md">
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {response && (
                    <div className="p-4 bg-slate-900 border border-slate-700 rounded-md">
                        <h3 className="text-sm font-medium text-slate-300 mb-2">Response:</h3>
                        <pre className="text-xs text-slate-400 overflow-auto max-h-96">
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
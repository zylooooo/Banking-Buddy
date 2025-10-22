import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleCallback, getUserFromToken } from '../services/authService';
import { userApi } from '../services/apiService';

export default function CallbackPage() {
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const processCallback = async () => {
            try {
                // Complete OAuth callback - this processes the auth code
                await handleCallback();
                
                // Wait a bit for tokens to be stored
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Get authenticated user info from token
                const user = await getUserFromToken();
                
                if (!user) {
                    throw new Error('Failed to get user information');
                }
                
                const res = await userApi.getUserById(user.sub);

                if (res.data.data.status === 'PENDING') {
                    // First-time user -redirect to MFA set up
                    navigate('/setup-mfa');
                } else {
                    // Returning user - redirect to dashboard
                    navigate('/dashboard');
                }
            } catch (err) {
                setError('Authentication failed');
                console.error('Callback error:', err);
            }
        };
    
        processCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 p-6 sm:p-8 rounded-lg shadow-xl max-w-md w-full">
                {error ? (
                    <>
                        <h2 className="text-lg sm:text-xl font-semibold text-red-400 mb-2">Authentication Error</h2>
                        <p className="text-sm sm:text-base text-slate-300 mb-4">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            Return to Login
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Signing you in...</h2>
                        <p className="text-sm sm:text-base text-slate-400">Please wait while we complete authentication.</p>
                    </>
                )}
            </div>
        </div>
    );
}
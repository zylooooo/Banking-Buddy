import React from 'react';
import { handleLogin } from '../services/authService';

export default function LoginPage() {
    const handleSignIn = async () => {
        try {
            await handleLogin();
        } catch (error) {
            console.error('Login redirect failed:', error);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Banking Buddy</h1>
                        <p className="mt-2 text-sm sm:text-base md:text-lg text-slate-300">Customer Relationship Management</p>
                    </div>

                    <div className="border-t border-slate-700 pt-6">
                        <p className="text-center text-xs sm:text-sm md:text-base text-slate-400 mb-6">
                            Sign in to access your dashboard and manage client relationships
                        </p>

                        <button
                            onClick={handleSignIn}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base md:text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 transition"
                        >
                            Sign In with Cognito
                        </button>
                    </div>

                    <div className="text-center">
                        <p className="text-xs sm:text-sm text-slate-500">
                            Secure authentication powered by AWS Cognito
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
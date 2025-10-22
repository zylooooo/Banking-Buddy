import React from 'react';
import { handleLogin, handleForgotPassword, loginAsAdmin, loginAsAgent } from '../services/authService';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();

    const handleSignIn = async () => {
        try {
            await handleLogin();
            navigate('/dashboard');
        } catch (error) {
            console.error('Login redirect failed:', error);
        }
    };

    const handleAdminLogin = async () => {
        try {
            await loginAsAdmin();
            navigate('/dashboard');
        } catch (error) {
            console.error('Admin login failed:', error);
        }
    };

    const handleAgentLogin = async () => {
        try {
            await loginAsAgent();
            navigate('/dashboard');
        } catch (error) {
            console.error('Agent login failed:', error);
        }
    };

    const handleForgotPasswordClick = async () => {
        try {
            await handleForgotPassword();
        } catch (error) {
            console.error('Forgot password failed:', error);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
                <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 ring-1 ring-blue-500/20">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">Scrooge Global Bank</h1>
                        <p className="mt-2 text-sm sm:text-base md:text-lg text-slate-300">Customer Relationship Management System</p>
                    </div>

                                        <div className="border-t border-gradient-to-r from-slate-700 via-blue-600/30 to-slate-700 pt-6">
                        <p className="text-center text-xs sm:text-sm md:text-base text-slate-300 mb-6">
                            Choose your role to access the system
                        </p>

                        {/* Development Login Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleAdminLogin}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base md:text-lg font-medium text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-800 transition-all duration-200 shadow-red-500/25 hover:shadow-red-500/40 hover:shadow-lg"
                            >
                                🔑 Login as Admin
                            </button>
                            
                            <button
                                onClick={handleAgentLogin}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base md:text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 transition-all duration-200 shadow-blue-500/25 hover:shadow-blue-500/40 hover:shadow-lg"
                            >
                                👤 Login as Agent
                            </button>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-xs sm:text-sm text-slate-500">
                            🚧 Development Mode - Click above to login
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                            Production will use AWS Cognito authentication
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
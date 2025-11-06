import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import AiGuide from '../components/AiGuide';
import NaturalLanguageQuery from '../components/NaturalLanguageQuery';
import { getUserFromToken } from '../services/authService';

export default function AiFeaturesPage() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const cognitoUser = await getUserFromToken();
                setUser(cognitoUser);
            } catch (err) {
                console.error('Failed to load user:', err);
            }
        };
        loadUser();
    }, []);

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={user} />
            <div className="ml-64">
                <Header user={user} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">AI Features</h2>
                        <p className="text-slate-400">Use AI to help navigate the CRM and query data</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AiGuide />
                        <NaturalLanguageQuery />
                    </div>
                </main>
            </div>
        </div>
    );
}

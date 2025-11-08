import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import AiGuide from '../components/AiGuide';
import NaturalLanguageQuery from '../components/NaturalLanguageQuery';
import { getUserFromToken } from '../services/authService';

export default function AiFeaturesPage() {
    const [user, setUser] = useState(null);
    const [guideCollapsed, setGuideCollapsed] = useState(false);
    const [queryCollapsed, setQueryCollapsed] = useState(false);
    const [activeComponent, setActiveComponent] = useState(null); // 'guide' or 'query'

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

    const handleGuideActive = () => {
        setActiveComponent('guide');
        setQueryCollapsed(true);
        setGuideCollapsed(false);
    };

    const handleQueryActive = () => {
        setActiveComponent('query');
        setGuideCollapsed(true);
        setQueryCollapsed(false);
    };

    const toggleGuide = () => {
        if (guideCollapsed) {
            setGuideCollapsed(false);
            setQueryCollapsed(true);
            setActiveComponent('guide');
        } else {
            setGuideCollapsed(true);
            if (activeComponent === 'guide') {
                setActiveComponent(null);
            }
        }
    };

    const toggleQuery = () => {
        if (queryCollapsed) {
            setQueryCollapsed(false);
            setGuideCollapsed(true);
            setActiveComponent('query');
        } else {
            setQueryCollapsed(true);
            if (activeComponent === 'query') {
                setActiveComponent(null);
            }
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={user} />
            <div className="ml-0 lg:ml-64 transition-all duration-300">
                <Header user={user} />
                <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <div className="mb-6 lg:mb-8">
                        <h2 className="text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            AI Features
                        </h2>
                        <p className="text-slate-400 text-sm lg:text-base">Use AI to help navigate the CRM and query data</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                        {/* AI Help Guide - Collapsible */}
                        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out relative ${
                            guideCollapsed 
                                ? 'lg:w-16 w-full' 
                                : activeComponent === 'query' && !queryCollapsed
                                    ? 'lg:w-0 lg:overflow-hidden lg:opacity-0'
                                    : 'lg:flex-1 w-full'
                        }`}>
                            {/* Collapsed Button - Always rendered but hidden when expanded */}
                            <button
                                onClick={toggleGuide}
                                className={`absolute inset-0 w-full lg:w-16 h-full min-h-[200px] lg:min-h-[600px] bg-slate-800 border border-slate-700 rounded-lg p-4 lg:p-2 flex flex-col lg:flex-col items-center justify-center gap-3 hover:bg-slate-750 transition-all z-10 group ${
                                    guideCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                                }`}
                                title="Expand AI Help Guide"
                            >
                                {/* Mobile: Horizontal layout */}
                                <div className="flex items-center gap-3 lg:hidden">
                                    <span className="text-slate-400 group-hover:text-white text-sm font-semibold">
                                        AI Help Guide
                                    </span>
                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                                
                                {/* Desktop: Vertical rotated layout */}
                                <div className="hidden lg:flex flex-col items-center justify-center h-full">
                                    <div className="transform rotate-[-90deg] origin-center">
                                        <div className="flex flex-row items-start gap-2">
                                            <span className="text-slate-400 group-hover:text-white text-sm font-semibold whitespace-nowrap">
                                                AI Help Guide
                                            </span>
                                            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </button>
                            
                            {/* Component - Always rendered but hidden when collapsed */}
                            <div className={`h-full transition-all duration-300 ${
                                guideCollapsed 
                                    ? 'opacity-0 pointer-events-none overflow-hidden absolute inset-0' 
                                    : 'opacity-100 pointer-events-auto relative'
                            }`}>
                                <AiGuide onActive={handleGuideActive} />
                            </div>
                        </div>

                        {/* CRM Assistant - Collapsible */}
                        <div className={`flex-shrink-0 transition-all duration-300 ease-in-out relative ${
                            queryCollapsed 
                                ? 'lg:w-16 w-full' 
                                : activeComponent === 'guide' && !guideCollapsed
                                    ? 'lg:w-0 lg:overflow-hidden lg:opacity-0'
                                    : 'lg:flex-1 w-full'
                        }`}>
                            {/* Collapsed Button - Always rendered but hidden when expanded */}
                            <button
                                onClick={toggleQuery}
                                className={`absolute inset-0 w-full lg:w-16 h-full min-h-[200px] lg:min-h-[600px] bg-slate-800 border border-slate-700 rounded-lg p-4 lg:p-2 flex flex-col lg:flex-col items-center justify-center gap-3 hover:bg-slate-750 transition-all z-10 group ${
                                    queryCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                                }`}
                                title="Expand CRM Assistant"
                            >
                                {/* Mobile: Horizontal layout */}
                                <div className="flex items-center gap-3 lg:hidden">
                                    <span className="text-slate-400 group-hover:text-white text-sm font-semibold">
                                        CRM Assistant
                                    </span>
                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-green-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                </div>
                                
                                {/* Desktop: Vertical rotated layout */}
                                <div className="hidden lg:flex flex-col items-center justify-center h-full">
                                    <div className="transform rotate-[-90deg] origin-center">
                                        <div className="flex flex-row items-start gap-2">
                                            <span className="text-slate-400 group-hover:text-white text-sm font-semibold whitespace-nowrap">
                                                CRM Assistant
                                            </span>
                                            <svg className="w-5 h-5 text-slate-400 group-hover:text-green-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </button>
                            
                            {/* Component - Always rendered but hidden when collapsed */}
                            <div className={`h-full transition-all duration-300 ${
                                queryCollapsed 
                                    ? 'opacity-0 pointer-events-none overflow-hidden absolute inset-0' 
                                    : 'opacity-100 pointer-events-auto relative'
                            }`}>
                                <NaturalLanguageQuery onActive={handleQueryActive} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

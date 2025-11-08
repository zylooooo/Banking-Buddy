import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getIdToken } from '../services/authService';

const markdownComponents = {
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-4 mb-2" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mt-3 mb-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-100 mt-3 mb-2" {...props} />,
    p: ({node, ...props}) => <p className="mb-3 text-slate-300 leading-relaxed" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-outside mb-4 ml-6 space-y-2 text-slate-300" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-outside mb-4 ml-6 space-y-2 text-slate-300" {...props} />,
    li: ({node, ...props}) => <li className="mb-2 leading-relaxed" {...props} />,
    code: ({node, inline, ...props}) => 
        inline ? (
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 text-sm" {...props} />
        ) : (
            <code className="block bg-slate-900 p-3 rounded-md overflow-x-auto text-sm text-slate-200 mb-3" {...props} />
        ),
    pre: ({node, ...props}) => <pre className="bg-slate-900 p-3 rounded-md overflow-x-auto mb-3" {...props} />,
    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
    a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
};

export default function NaturalLanguageQuery({ onActive }) {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [typingText, setTypingText] = useState('');
    const typingIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        if (onActive) {
            onActive();
        }

        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
        }

        setLoading(true);
        setError(null);
        setResponse(null);
        setTypingText('');

        try {
            const token = await getIdToken();
            
            const response = await fetch(`${import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8083'}/api/ai/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                    'x-amzn-oidc-data': token || ''
                },
                body: JSON.stringify({ query: query })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const fullText = data.naturalLanguageResponse || '';
            
            if (!fullText) {
                setError('No response received from the server');
                setLoading(false);
                return;
            }
            
            let currentIndex = 0;
            
            setLoading(false);
            
            typingIntervalRef.current = setInterval(() => {
                currentIndex += 3;
                
                if (currentIndex >= fullText.length) {
                    setTypingText(fullText);
                    setResponse(data);
                    clearInterval(typingIntervalRef.current);
                    typingIntervalRef.current = null;
                } else {
                    setTypingText(fullText.substring(0, currentIndex));
                }
            }, 20);

        } catch (err) {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
            setError(err.message || 'Failed to process query');
            console.error('NL Query error:', err);
            setLoading(false);
        }
    };

    // Format currency for display
    const formatCurrency = (value) => {
        if (!value) return '';
        // If already formatted as currency, return as is
        if (typeof value === 'string' && value.includes('$')) {
            return value;
        }
        // Otherwise format it
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('en-SG', {
            style: 'currency',
            currency: 'SGD'
        }).format(num);
    };

    // Format date for display
    const formatDate = (value) => {
        if (!value) return '';
        // If already in DD/MM/YYYY format, return as is
        if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            return value;
        }
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return value;
            return date.toLocaleDateString('en-SG', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return value;
        }
    };

    // Get badge styling for transaction type and status (matching TransactionManagementPage)
    const getTypeBadgeClass = (type) => {
        if (!type) return 'bg-slate-700 text-slate-300';
        const lowerType = type.toLowerCase();
        if (lowerType === 'deposit') return 'bg-green-500 text-white';
        if (lowerType === 'withdrawal') return 'bg-blue-500 text-white';
        return 'bg-slate-700 text-slate-300';
    };

    const getStatusBadgeClass = (status) => {
        if (!status) return 'bg-slate-700 text-slate-300';
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'completed') return 'bg-green-500 text-white';
        if (lowerStatus === 'pending') return 'bg-orange-500 text-white';
        if (lowerStatus === 'failed') return 'bg-red-500 text-white';
        // For client status: Verified/Unverified
        if (lowerStatus === 'verified') return 'bg-green-900 text-green-300';
        if (lowerStatus === 'unverified') return 'bg-yellow-900 text-yellow-300';
        return 'bg-slate-700 text-slate-300';
    };

    return (
        <div className="h-full flex flex-col bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
                <h3 className="text-xl lg:text-2xl font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    CRM Assistant
                </h3>
                <p className="text-xs lg:text-sm text-slate-400">Query your CRM data using natural language</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                <form onSubmit={handleSubmit} className="mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask me anything! (e.g., Show me all my clients)"
                            className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg hover:from-green-700 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-green-500/50 font-medium"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    Querying...
                                </span>
                            ) : 'Query'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 backdrop-blur-sm animate-fade-in">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Error</span>
                        </div>
                        <p className="mt-1 text-sm">{error}</p>
                    </div>
                )}

                {typingText && !response && (
                    <div className="p-4 lg:p-5 bg-slate-700/50 rounded-lg border border-slate-600 backdrop-blur-sm animate-fade-in">
                        <p className="text-slate-200 mb-3 font-semibold flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Response (typing...):
                        </p>
                        <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                                {typingText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {response && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="p-4 lg:p-5 bg-slate-700/50 rounded-lg border border-slate-600 backdrop-blur-sm">
                            <p className="text-slate-200 mb-3 font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Response:
                            </p>
                            <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown components={markdownComponents}>
                                    {response.naturalLanguageResponse || 'No response content available'}
                                </ReactMarkdown>
                            </div>
                            {(response.queryType || response.sqlQuery) && (
                                <div className="mt-3 pt-3 border-t border-slate-600">
                                    <p className="text-xs text-slate-500 flex flex-wrap gap-2">
                                        {response.queryType && (
                                            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded-md">
                                                Type: {response.queryType}
                                            </span>
                                        )}
                                        {response.sqlQuery && (
                                            <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded-md">
                                                API: {response.sqlQuery}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        {response.results && response.results.length > 0 && response.results[0] && (
                            <div className="animate-fade-in">
                                <p className="text-sm text-slate-400 mb-3 font-medium">
                                    Results ({response.results.length}):
                                </p>
                                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    {Object.keys(response.results[0]).map((key) => (
                                                        <th key={key} className="text-left p-4 text-slate-300 font-medium whitespace-nowrap">
                                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {response.results.map((result, idx) => (
                                                    result && (
                                                        <tr key={idx} className="border-b border-slate-700 hover:bg-slate-750">
                                                            {Object.entries(result).map(([key, value], valIdx) => {
                                                                const stringValue = String(value);
                                                                let displayValue = stringValue;
                                                                
                                                                // Format based on column name
                                                                if (key.toLowerCase().includes('amount')) {
                                                                    displayValue = formatCurrency(stringValue);
                                                                } else if (key.toLowerCase().includes('date')) {
                                                                    displayValue = formatDate(stringValue);
                                                                }
                                                                
                                                                // Check if it's a badge (Type or Status)
                                                                const isType = key.toLowerCase().includes('type');
                                                                const isStatus = key.toLowerCase().includes('status');
                                                                
                                                                // Determine text color based on column type
                                                                const isId = key.toLowerCase().includes('id');
                                                                const isEmail = key.toLowerCase().includes('email');
                                                                const isName = key.toLowerCase().includes('name');
                                                                
                                                                return (
                                                                    <td key={valIdx} className={`p-4 ${
                                                                        isId ? 'text-white font-mono text-sm' :
                                                                        isName ? 'text-white' :
                                                                        isEmail ? 'text-slate-300' :
                                                                        'text-slate-300'
                                                                    }`}>
                                                                        {isType ? (
                                                                            <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeClass(stringValue)}`}>
                                                                                {stringValue}
                                                                            </span>
                                                                        ) : isStatus ? (
                                                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(stringValue)}`}>
                                                                                {stringValue}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="whitespace-nowrap">{displayValue}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    )
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

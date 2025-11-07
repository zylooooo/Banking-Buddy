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

export default function NaturalLanguageQuery() {
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

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">CRM Assistant</h3>
            
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask me anything!"
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {loading ? 'Querying...' : 'Query'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300">
                    {error}
                </div>
            )}

            {typingText && !response && (
                <div className="mb-4 p-4 bg-slate-700 rounded-md">
                    <p className="text-slate-200 mb-2 font-semibold flex items-center gap-2">
                        Response (typing...):
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    </p>
                    <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown components={markdownComponents}>
                            {typingText}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {response && (
                <div className="space-y-4">
                    <div className="p-4 bg-slate-700 rounded-md">
                        <p className="text-slate-200 mb-2 font-semibold">Response:</p>
                        <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                                {response.naturalLanguageResponse || 'No response content available'}
                            </ReactMarkdown>
                        </div>
                        {(response.queryType || response.sqlQuery) && (
                            <p className="text-xs text-slate-500 mt-2">
                                {response.queryType && `Query Type: ${response.queryType}`}
                                {response.queryType && response.sqlQuery && ' | '}
                                {response.sqlQuery && `API: ${response.sqlQuery}`}
                            </p>
                        )}
                    </div>

                    {response.results && response.results.length > 0 && response.results[0] && (
                        <div>
                            <p className="text-sm text-slate-400 mb-2">Results ({response.results.length}):</p>
                            <div className="bg-slate-700 rounded-md overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-600 text-slate-300">
                                        <tr>
                                            {Object.keys(response.results[0]).map((key) => (
                                                <th key={key} className="px-4 py-2 capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {response.results.map((result, idx) => (
                                            result && (
                                                <tr key={idx} className="border-t border-slate-600 text-slate-300">
                                                    {Object.values(result).map((value, valIdx) => (
                                                        <td key={valIdx} className="px-4 py-2">
                                                            {String(value)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

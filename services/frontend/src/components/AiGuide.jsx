import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '../services/apiService';

const markdownComponents = {
    h1: ({...props}) => <h1 className="text-2xl font-bold text-white mt-4 mb-2" {...props} />,
    h2: ({...props}) => <h2 className="text-xl font-semibold text-white mt-3 mb-2" {...props} />,
    h3: ({...props}) => <h3 className="text-lg font-semibold text-slate-100 mt-3 mb-2" {...props} />,
    p: ({...props}) => <p className="mb-3 text-slate-300 leading-relaxed" {...props} />,
    ul: ({...props}) => <ul className="list-disc list-outside mb-4 ml-6 space-y-2 text-slate-300" {...props} />,
    ol: ({...props}) => <ol className="list-decimal list-outside mb-4 ml-6 space-y-2 text-slate-300" {...props} />,
    li: ({...props}) => <li className="mb-2 leading-relaxed" {...props} />,
    code: ({inline, ...props}) => 
        inline ? (
            <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300 text-sm" {...props} />
        ) : (
            <code className="block bg-slate-900 p-3 rounded-md overflow-x-auto text-sm text-slate-200 mb-3" {...props} />
        ),
    pre: ({...props}) => <pre className="bg-slate-900 p-3 rounded-md overflow-x-auto mb-3" {...props} />,
    strong: ({...props}) => <strong className="font-semibold text-white" {...props} />,
    a: ({...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
};

export default function AiGuide({ onActive }) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [relatedTopics, setRelatedTopics] = useState([]);
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
        if (!question.trim()) return;

        if (onActive) {
            onActive();
        }

        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
        }

        setLoading(true);
        setError(null);
        setAnswer('');
        setTypingText('');

        try {
            const response = await aiApi.askGuide(question);
            const fullText = response?.data?.data?.answer || '';
            const topics = response?.data?.data?.relatedTopics || [];
            
            if (!fullText) {
                setError('No answer received from the server');
                setLoading(false);
                return;
            }
            
            setLoading(false);
            
            let currentIndex = 0;
            
            typingIntervalRef.current = setInterval(() => {
                currentIndex += 3;
                
                if (currentIndex >= fullText.length) {
                    setTypingText(fullText);
                    setAnswer(fullText);
                    setRelatedTopics(topics);
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
            setError(err.response?.data?.message || 'Failed to get answer');
            console.error('AI Guide error:', err);
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
                <h3 className="text-xl lg:text-2xl font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    AI Help Guide
                </h3>
                <p className="text-xs lg:text-sm text-slate-400">Get help with using the CRM system</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                <form onSubmit={handleSubmit} className="mb-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask: How do I reset my password?"
                            className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50 font-medium"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    Asking...
                                </span>
                            ) : 'Ask'}
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

                {typingText && !answer && (
                    <div className="p-4 lg:p-5 bg-slate-700/50 rounded-lg border border-slate-600 backdrop-blur-sm animate-fade-in">
                        <p className="text-slate-200 mb-3 font-semibold flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                            Answer (typing...):
                        </p>
                        <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown components={markdownComponents}>
                                {typingText}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {answer && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="p-4 lg:p-5 bg-slate-700/50 rounded-lg border border-slate-600 backdrop-blur-sm">
                            <p className="text-slate-200 mb-3 font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Answer:
                            </p>
                            <div className="text-slate-300 prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown components={markdownComponents}>
                                    {answer}
                                </ReactMarkdown>
                            </div>
                        </div>
                        {relatedTopics.length > 0 && (
                            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <p className="text-sm text-slate-400 mb-3 font-medium">Related topics:</p>
                                <div className="flex flex-wrap gap-2">
                                    {relatedTopics.map((topic, idx) => (
                                        <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-blue-900/50 text-blue-300 rounded-full text-sm font-medium hover:bg-blue-800/50 transition-colors cursor-default"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

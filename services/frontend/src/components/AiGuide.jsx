import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '../services/apiService';

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

export default function AiGuide() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [relatedTopics, setRelatedTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [typingText, setTypingText] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setLoading(true);
        setError(null);
        setAnswer('');
        setTypingText('');

        try {
            const response = await aiApi.askGuide(question);
            const fullText = response.data.data.answer;
            const topics = response.data.data.relatedTopics || [];
            
            setLoading(false);
            
            let currentIndex = 0;
            
            const intervalId = setInterval(() => {
                currentIndex += 3;
                
                if (currentIndex >= fullText.length) {
                    setTypingText(fullText);
                    setAnswer(fullText);
                    setRelatedTopics(topics);
                    clearInterval(intervalId);
                } else {
                    setTypingText(fullText.substring(0, currentIndex));
                }
            }, 20);

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to get answer');
            console.error('AI Guide error:', err);
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-md p-6">
            <h3 className="text-xl font-semibold text-white mb-4">AI Help Guide</h3>
            
            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask: How do I reset my password?"
                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {loading ? 'Asking...' : 'Ask'}
                    </button>
                </div>
            </form>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-300">
                    {error}
                </div>
            )}

            {typingText && !answer && (
                <div className="mb-4">
                    <div className="p-4 bg-slate-700 rounded-md text-slate-200">
                        <p className="text-slate-200 mb-2 font-semibold flex items-center gap-2">
                            Answer (typing...):
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        </p>
                        <ReactMarkdown components={markdownComponents}>
                            {typingText}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {answer && (
                <div className="mb-4">
                    <div className="p-4 bg-slate-700 rounded-md text-slate-200">
                        <ReactMarkdown components={markdownComponents}>
                            {answer}
                        </ReactMarkdown>
                    </div>
                    {relatedTopics.length > 0 && (
                        <div className="mt-3">
                            <p className="text-sm text-slate-400 mb-2">Related topics:</p>
                            <div className="flex flex-wrap gap-2">
                                {relatedTopics.map((topic, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm"
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
    );
}

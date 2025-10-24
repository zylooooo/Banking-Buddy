import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { communicationApi, clientApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

export default function CommunicationPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [clients, setClients] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }

                const cognitoUser = await getUserFromToken();
                setCurrentUser(cognitoUser);

                // Load clients
                const clientsResponse = await clientApi.getAllClients();
                setClients(clientsResponse.data.data || []);

                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const loadCommunicationHistory = async (clientId) => {
        try {
            const response = await communicationApi.getCommunicationHistory(clientId);
            setCommunications(response.data.data || []);
        } catch (err) {
            setError('Failed to load communication history');
        }
    };

    const handleSendEmail = async (emailData) => {
        try {
            await communicationApi.sendClientEmail(selectedClientId, emailData);
            setShowComposeModal(false);
            // Refresh communication history
            if (selectedClientId) {
                await loadCommunicationHistory(selectedClientId);
            }
            alert('Email sent successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send email');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading communications...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Client Communications</h2>
                        <p className="text-slate-400">Send emails and view communication history</p>
                    </div>
                    <button
                        onClick={() => setShowComposeModal(true)}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Compose Email
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="float-right text-red-300 hover:text-red-100"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* Client Selection */}
                <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Select Client</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Client
                            </label>
                            <select
                                value={selectedClientId}
                                onChange={(e) => {
                                    setSelectedClientId(e.target.value);
                                    if (e.target.value) {
                                        loadCommunicationHistory(e.target.value);
                                    } else {
                                        setCommunications([]);
                                    }
                                }}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select a client to view communications</option>
                                {clients.map(client => (
                                    <option key={client.clientId} value={client.clientId}>
                                        {client.firstName} {client.lastName} ({client.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Communication History */}
                {selectedClientId && (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-lg font-semibold text-white">Communication History</h3>
                            <p className="text-slate-400">
                                {clients.find(c => c.clientId === selectedClientId)?.firstName} {' '}
                                {clients.find(c => c.clientId === selectedClientId)?.lastName}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            {communications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    No communications found for this client.
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left p-4 text-slate-300 font-medium">Date/Time</th>
                                            <th className="text-left p-4 text-slate-300 font-medium">Type</th>
                                            <th className="text-left p-4 text-slate-300 font-medium">Subject</th>
                                            <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                                            <th className="text-left p-4 text-slate-300 font-medium">Agent</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {communications.map((comm, index) => (
                                            <tr key={index} className="border-b border-slate-700 hover:bg-slate-750">
                                                <td className="p-4 text-slate-300 text-sm">
                                                    {new Date(comm.dateTime).toLocaleString('en-SG')}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">
                                                        Email
                                                    </span>
                                                </td>
                                                <td className="p-4 text-white">{comm.subject}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                        comm.status === 'SENT' 
                                                            ? 'bg-green-900 text-green-300'
                                                            : comm.status === 'FAILED'
                                                            ? 'bg-red-900 text-red-300'
                                                            : 'bg-yellow-900 text-yellow-300'
                                                    }`}>
                                                        {comm.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-300">{comm.agentName}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Compose Email Modal */}
                {showComposeModal && (
                    <ComposeEmailModal
                        clients={clients}
                        selectedClientId={selectedClientId}
                        onSend={handleSendEmail}
                        onClose={() => setShowComposeModal(false)}
                    />
                )}
                </main>
            </div>
        </div>
    );
}

function ComposeEmailModal({ clients, selectedClientId, onSend, onClose }) {
    const [emailData, setEmailData] = useState({
        clientId: selectedClientId || '',
        subject: '',
        message: '',
        template: ''
    });

    const emailTemplates = {
        welcome: {
            subject: 'Welcome to Scrooge Global Bank',
            message: `Dear [CLIENT_NAME],

Welcome to Scrooge Global Bank! We're excited to have you as our valued client.

Your account has been successfully created and is now active. You can now enjoy our full range of banking services.

If you have any questions, please don't hesitate to contact us.

Best regards,
Scrooge Global Bank Team`
        },
        account_created: {
            subject: 'New Account Created Successfully',
            message: `Dear [CLIENT_NAME],

We're pleased to inform you that your new account has been successfully created.

Account Details:
- Account Type: [ACCOUNT_TYPE]
- Account Number: [ACCOUNT_NUMBER]

Your account is now active and ready to use.

Best regards,
Scrooge Global Bank Team`
        },
        verification_complete: {
            subject: 'Identity Verification Complete',
            message: `Dear [CLIENT_NAME],

Your identity verification has been successfully completed. Your account is now fully activated with access to all our services.

Thank you for choosing Scrooge Global Bank.

Best regards,
Scrooge Global Bank Team`
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSend(emailData);
    };

    const handleTemplateSelect = (templateKey) => {
        const template = emailTemplates[templateKey];
        setEmailData(prev => ({
            ...prev,
            subject: template.subject,
            message: template.message,
            template: templateKey
        }));
    };

    const handleChange = (field, value) => {
        setEmailData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Compose Email</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                    >
                        ×
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Recipient *
                        </label>
                        <select
                            value={emailData.clientId}
                            onChange={(e) => handleChange('clientId', e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Select a client</option>
                            {clients.map(client => (
                                <option key={client.clientId} value={client.clientId}>
                                    {client.firstName} {client.lastName} ({client.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Template (Optional)
                        </label>
                        <select
                            value={emailData.template}
                            onChange={(e) => handleTemplateSelect(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">Choose a template...</option>
                            <option value="welcome">Welcome Email</option>
                            <option value="account_created">Account Created</option>
                            <option value="verification_complete">Verification Complete</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Subject *
                        </label>
                        <input
                            type="text"
                            value={emailData.subject}
                            onChange={(e) => handleChange('subject', e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Message *
                        </label>
                        <textarea
                            value={emailData.message}
                            onChange={(e) => handleChange('message', e.target.value)}
                            required
                            rows={10}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Use [CLIENT_NAME], [ACCOUNT_TYPE], [ACCOUNT_NUMBER] for dynamic placeholders
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                        >
                            Send Email
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
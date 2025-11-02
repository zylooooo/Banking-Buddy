import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { clientApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { formatPhoneNumber } from '../utils/phone';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default function ClientDetailPage() {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [client, setClient] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showCreateAccount, setShowCreateAccount] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }

                const cognitoUser = await getUserFromToken();
                setCurrentUser(cognitoUser);

                // Fetch client details by ID
                const response = await clientApi.getClientById(clientId);
                if (response.data && response.data.success && response.data.data) {
                    setClient(response.data.data);
                } else {
                    throw new Error(response.data?.message || 'Client not found');
                }

                // Fetch accounts for this client using clientId API
                const accountsRes = await clientApi.getAccountsByClientId(clientId);
                if (accountsRes.data && accountsRes.data.success && Array.isArray(accountsRes.data.data)) {
                    setAccounts(accountsRes.data.data);
                } else {
                    setAccounts([]);
                }
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Error fetching client details');
                setClient(null);
                setAccounts([]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [clientId, navigate]);

    const handleUpdateClient = async (updatedData) => {
        try {
            // Normalize phone number using libphonenumber-js
            let normalizedPhoneNumber = updatedData.phoneNumber;
            if (updatedData.phoneNumber) {
                try {
                    const cleanValue = updatedData.phoneNumber.replace(/\s/g, '');
                    // Default to Singapore if client country is not available
                    const phoneNumber = parsePhoneNumberFromString(cleanValue, 'SG');
                    
                    if (phoneNumber) {
                        // Extract digits with country code: countryCallingCode + nationalNumber
                        normalizedPhoneNumber = phoneNumber.countryCallingCode + phoneNumber.nationalNumber;
                    } else {
                        // Fallback: strip non-digits if parsing fails
                        normalizedPhoneNumber = cleanValue.replace(/\D/g, '');
                    }
                } catch (err) {
                    console.error('Failed to parse phone number:', err);
                    // Fallback: strip non-digits if parsing fails
                    normalizedPhoneNumber = updatedData.phoneNumber.replace(/\D/g, '');
                }
            }

            const normalizedData = {
                ...updatedData,
                phoneNumber: normalizedPhoneNumber
            };

            const response = await clientApi.updateClient(clientId, normalizedData);
            setClient(response.data.data);
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update client');
        }
    };

    const handleCreateAccount = async (accountData) => {
        try {
            await clientApi.createAccount({
                ...accountData,
                clientId: clientId
            });
            // Refresh accounts list
            const accountsRes = await clientApi.getAccountsByClientId(clientId);
            if (accountsRes.data && accountsRes.data.success && Array.isArray(accountsRes.data.data)) {
                setAccounts(accountsRes.data.data);
            }
            setShowCreateAccount(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create account');
        }
    };

    const handleDeleteAccount = async (accountId) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            try {
                await clientApi.deleteAccount(accountId);
                // Refresh accounts list
                const accountsRes = await clientApi.getAccountsByClientId(clientId);
                if (accountsRes.data && accountsRes.data.success && Array.isArray(accountsRes.data.data)) {
                    setAccounts(accountsRes.data.data);
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete account');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <p className="text-slate-300">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="bg-slate-800 border border-red-700 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
                    <p className="text-slate-300 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Back to Clients
                    </button>
                </div>
            </div>
        );
    }

    if (!client && !loading && !error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="bg-slate-800 border border-red-700 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold text-red-400 mb-2">Client Not Found</h2>
                    <p className="text-slate-300 mb-4">The requested client does not exist or you do not have access.</p>
                    <button
                        onClick={() => navigate('/clients')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Back to Clients
                    </button>
                </div>
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
                        <button
                            onClick={() => navigate('/clients')}
                            className="text-accent hover:text-sky-400 mb-2 flex items-center gap-2"
                        >
                            ← Back to Clients
                        </button>
                        <h2 className="text-2xl font-bold text-white">
                            {client.firstName} {client.lastName}
                        </h2>
                        <p className="text-slate-400">Client Details and Account Management</p>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                    >
                        {isEditing ? 'Cancel Edit' : 'Edit Client'}
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Client Information */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Client Information</h3>
                        {isEditing ? (
                            <EditClientForm
                                client={client}
                                onSubmit={handleUpdateClient}
                                onCancel={() => setIsEditing(false)}
                            />
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Name</label>
                                    <p className="text-white">{client.firstName} {client.lastName}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Email</label>
                                    <p className="text-white">{client.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Phone</label>
                                    <p className="text-white">{formatPhoneNumber(client.phoneNumber, 'SG')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Address</label>
                                    <p className="text-white">{client.address}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Date of Birth</label>
                                    <p className="text-white">{new Date(client.dateOfBirth).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400">Status</label>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        client.verified
                                            ? 'bg-green-900 text-green-300'
                                            : 'bg-yellow-900 text-yellow-300'
                                    }`}>
                                        {client.verified ? 'Verified' : 'Pending Verification'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Accounts */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Accounts</h3>
                            <button
                                onClick={() => setShowCreateAccount(true)}
                                className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-sky-600 transition"
                            >
                                Add Account
                            </button>
                        </div>

                        {showCreateAccount && (
                            <CreateAccountForm
                                onSubmit={handleCreateAccount}
                                onCancel={() => setShowCreateAccount(false)}
                            />
                        )}

                        <div className="space-y-3">
                            {accounts && accounts.length > 0 ? (
                                accounts.map((account) => (
                                    <div key={account.accountId} className="bg-slate-700 p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium text-white">{account.accountType}</h4>
                                                <p className="text-sm text-slate-400">Account #: {account.accountId}</p>
                                                <p className="text-lg font-semibold text-white mt-1">
                                                    ${account.balance?.toFixed(2) || '0.00'}
                                                </p>
                                                {account.accountStatus && (
                                                    <span className={`px-2 py-1 text-xs rounded-full mt-2 inline-block ${
                                                        account.accountStatus === 'ACTIVE'
                                                            ? 'bg-green-900 text-green-300'
                                                            : 'bg-red-900 text-red-300'
                                                    }`}>
                                                        {account.accountStatus}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteAccount(account.accountId)}
                                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-center py-8">
                                    No accounts found. Create the first account for this client.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                </main>
            </div>
        </div>
    );
}

function EditClientForm({ client, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phoneNumber: client.phoneNumber || '',
        address: client.address || '',
        dateOfBirth: client.dateOfBirth ? client.dateOfBirth.split('T')[0] : ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>
            <div className="flex gap-3 pt-4">
                <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                >
                    Update Client
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}

function CreateAccountForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        accountType: 'Savings',
        accountStatus: 'Active',
        initialDeposit: '',
        currency: 'SGD',
        branchId: 'SG001'
    });

    const [validationErrors, setValidationErrors] = useState({});

    const validateField = (name, value) => {
        const errors = {};

        switch (name) {
            case 'accountType':
                if (!value) {
                    errors[name] = 'Account type is required';
                }
                break;

            case 'accountStatus':
                if (!value) {
                    errors[name] = 'Account status is required';
                }
                break;

            case 'initialDeposit': {
                const amount = parseFloat(value);
                if (value && (isNaN(amount) || amount < 0)) {
                    errors[name] = 'Initial deposit must be a positive number';
                } else if (formData.accountType === 'Savings' && value && amount < 100) {
                    errors[name] = 'Savings account requires minimum SGD 100 initial deposit';
                }
                break;
            }

            case 'currency':
                if (!value) {
                    errors[name] = 'Currency is required';
                }
                break;

            case 'branchId':
                if (!value) {
                    errors[name] = 'Branch ID is required';
                }
                break;

            default:
                break;
        }

        return errors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate all fields
        let allErrors = {};
        Object.keys(formData).forEach(key => {
            const fieldErrors = validateField(key, formData[key]);
            allErrors = { ...allErrors, ...fieldErrors };
        });

        setValidationErrors(allErrors);

        // If no errors, submit the form
        if (Object.keys(allErrors).length === 0) {
            onSubmit({
                ...formData,
                initialDeposit: parseFloat(formData.initialDeposit) || 0,
                openingDate: new Date().toISOString().split('T')[0]
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear validation error for this field and validate
        const fieldErrors = validateField(name, value);
        setValidationErrors(prev => ({
            ...prev,
            [name]: fieldErrors[name] || undefined
        }));
    };

    return (
        <div className="mb-4 p-4 bg-slate-700 rounded-lg">
            <h4 className="text-white font-medium mb-3">Create New Account</h4>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Account Type *
                    </label>
                    <select
                        name="accountType"
                        value={formData.accountType}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.accountType
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-500 focus:ring-primary'
                        }`}
                    >
                        <option value="Savings">Savings</option>
                        <option value="Checking">Checking</option>
                        <option value="Business">Business</option>
                        <option value="Fixed Deposit">Fixed Deposit</option>
                    </select>
                    {validationErrors.accountType && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.accountType}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Account Status *
                    </label>
                    <select
                        name="accountStatus"
                        value={formData.accountStatus}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.accountStatus
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-500 focus:ring-primary'
                        }`}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Pending">Pending</option>
                    </select>
                    {validationErrors.accountStatus && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.accountStatus}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Initial Deposit (SGD)
                    </label>
                    <input
                        type="number"
                        name="initialDeposit"
                        value={formData.initialDeposit}
                        onChange={handleChange}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.initialDeposit
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-500 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.initialDeposit && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.initialDeposit}</p>
                    )}
                    {formData.accountType === 'Savings' && (
                        <p className="text-slate-400 text-xs mt-1">Minimum SGD 100 for Savings account</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Currency *
                    </label>
                    <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.currency
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-500 focus:ring-primary'
                        }`}
                    >
                        <option value="SGD">Singapore Dollar (SGD)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                        <option value="MYR">Malaysian Ringgit (MYR)</option>
                    </select>
                    {validationErrors.currency && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.currency}</p>
                    )}
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Branch ID *
                    </label>
                    <select
                        name="branchId"
                        value={formData.branchId}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-600 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.branchId
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-500 focus:ring-primary'
                        }`}
                    >
                        <option value="SG001">Singapore Main Branch (SG001)</option>
                        <option value="SG002">Singapore Orchard Branch (SG002)</option>
                        <option value="SG003">Singapore Marina Bay Branch (SG003)</option>
                        <option value="KL001">Kuala Lumpur Branch (KL001)</option>
                        <option value="BKK001">Bangkok Branch (BKK001)</option>
                    </select>
                    {validationErrors.branchId && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.branchId}</p>
                    )}
                </div>

                <div className="md:col-span-2 flex gap-2 pt-2">
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-sky-600 transition font-medium"
                    >
                        Create Account
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm bg-slate-600 text-white rounded hover:bg-slate-700 transition font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
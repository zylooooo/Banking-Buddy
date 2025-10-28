import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { clientApi, userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';

export default function ClientManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                const isAuth = await isAuthenticated();
                if (!isAuth) {
                    navigate('/');
                    return;
                }

                // Get user ID from Cognito token first
                const cognitoUser = await getUserFromToken();
                if (!cognitoUser || !cognitoUser.sub) {
                    throw new Error('Unable to get user ID from token');
                }

                // Use the existing getUserById endpoint with the user's own ID
                const userResponse = await userApi.getUserById(cognitoUser.sub);
                setCurrentUser(userResponse.data.data); // Backend returns { data: UserDTO, message: string }

                // Load clients
                const response = await clientApi.getAllClients();
                setClients(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handleCreateClient = async (clientData) => {
        try {
            await clientApi.createClient(clientData);
            // Refresh clients list
            const response = await clientApi.getAllClients();
            setClients(response.data.data);
            setShowCreateForm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create client');
        }
    };

    const handleVerifyClient = async (clientId) => {
        try {
            await clientApi.verifyClient(clientId);
            // Refresh clients list with cache busting
            const response = await clientApi.getAllClients(Date.now());
            setClients(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify client');
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            try {
                await clientApi.deleteClient(clientId);
                // Refresh clients list
                const response = await clientApi.getAllClients();
                setClients(response.data.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete client');
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

    return (
        <div className="min-h-screen bg-slate-900">
            <Navigation user={currentUser} />
            <div className="ml-64">
                <Header user={currentUser} />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Client Management</h2>
                        <p className="text-slate-400">Manage client profiles and information</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition"
                    >
                        Create New Client
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

                {showCreateForm && (
                    <CreateClientForm
                        onSubmit={handleCreateClient}
                        onCancel={() => setShowCreateForm(false)}
                    />
                )}

                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-slate-300 font-medium">Name</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Email</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Phone</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                                    <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center p-8 text-slate-400">
                                            No clients found. Create your first client to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    clients.map((client) => (
                                        <tr key={client.clientId} className="border-b border-slate-700 hover:bg-slate-750">
                                            <td className="p-4 text-white">
                                                {client.firstName} {client.lastName}
                                            </td>
                                            <td className="p-4 text-slate-300">{client.email}</td>
                                            <td className="p-4 text-slate-300">{client.phoneNumber}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    client.verified
                                                        ? 'bg-green-900 text-green-300'
                                                        : 'bg-yellow-900 text-yellow-300'
                                                }`}>
                                                    {client.verified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => navigate(`/clients/${client.clientId}`)}
                                                        className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-sky-600 transition"
                                                    >
                                                        View
                                                    </button>
                                                    {!client.verified && (
                                                        <button
                                                            onClick={() => handleVerifyClient(client.clientId)}
                                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                        >
                                                            Verify
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteClient(client.clientId)}
                                                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                </main>
            </div>
        </div>
    );
}

function CreateClientForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        email: '',
        phoneNumber: '',
        address: '',
        city: '',
        state: '',
        country: 'Singapore',
        postalCode: ''
    });

    const [validationErrors, setValidationErrors] = useState({});

    const validateField = (name, value) => {
        const errors = {};

        switch (name) {
            case 'firstName':
            case 'lastName':
                if (!value) {
                    errors[name] = 'This field is required';
                } else if (value.length < 2) {
                    errors[name] = 'Minimum 2 characters required';
                } else if (value.length > 50) {
                    errors[name] = 'Maximum 50 characters allowed';
                } else if (!/^[a-zA-Z\s]+$/.test(value)) {
                    errors[name] = 'Only alphabetic characters and spaces allowed';
                }
                break;

            case 'dateOfBirth':
                if (!value) {
                    errors[name] = 'Date of birth is required';
                } else {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    if (birthDate >= today) {
                        errors[name] = 'Date of birth must be in the past';
                    } else if (age < 18) {
                        errors[name] = 'Client must be at least 18 years old';
                    } else if (age > 100) {
                        errors[name] = 'Age cannot exceed 100 years';
                    }
                }
                break;

            case 'gender':
                if (!value) {
                    errors[name] = 'Gender is required';
                }
                break;

            case 'email':
                if (!value) {
                    errors[name] = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    errors[name] = 'Please enter a valid email address';
                }
                break;

            case 'phoneNumber':
                if (!value) {
                    errors[name] = 'Phone number is required';
                } else if (!/^\+?[1-9]\d{9,14}$/.test(value.replace(/\s/g, ''))) {
                    errors[name] = 'Please enter a valid phone number (10-15 digits)';
                }
                break;

            case 'address':
                if (!value) {
                    errors[name] = 'Address is required';
                } else if (value.length < 5) {
                    errors[name] = 'Minimum 5 characters required';
                } else if (value.length > 100) {
                    errors[name] = 'Maximum 100 characters allowed';
                }
                break;

            case 'city':
            case 'state':
                if (!value) {
                    errors[name] = 'This field is required';
                } else if (value.length < 2) {
                    errors[name] = 'Minimum 2 characters required';
                } else if (value.length > 50) {
                    errors[name] = 'Maximum 50 characters allowed';
                }
                break;

            case 'country':
                if (!value) {
                    errors[name] = 'Country is required';
                } else if (value.length < 2) {
                    errors[name] = 'Minimum 2 characters required';
                } else if (value.length > 50) {
                    errors[name] = 'Maximum 50 characters allowed';
                }
                break;

            case 'postalCode':
                if (!value) {
                    errors[name] = 'Postal code is required';
                } else if (value.length < 4) {
                    errors[name] = 'Minimum 4 characters required';
                } else if (value.length > 10) {
                    errors[name] = 'Maximum 10 characters allowed';
                } else if (formData.country === 'Singapore' && !/^\d{6}$/.test(value)) {
                    errors[name] = 'Singapore postal code must be 6 digits';
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
            onSubmit(formData);
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
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Client</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Personal Information */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        First Name *
                    </label>
                    <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.firstName
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.firstName && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.firstName}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Last Name *
                    </label>
                    <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.lastName
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.lastName && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.lastName}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Date of Birth *
                    </label>
                    <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.dateOfBirth
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.dateOfBirth && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.dateOfBirth}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Gender *
                    </label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.gender
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {validationErrors.gender && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.gender}</p>
                    )}
                </div>

                {/* Contact Information */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Email Address *
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.email
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.email}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="+65 XXXX XXXX"
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.phoneNumber
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.phoneNumber && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.phoneNumber}</p>
                    )}
                </div>

                {/* Address Information */}
                <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Address *
                    </label>
                    <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        maxLength={100}
                        placeholder="Street address, building, apartment"
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.address
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.address && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.address}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        City *
                    </label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.city
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.city && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.city}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        State *
                    </label>
                    <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        maxLength={50}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.state
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.state && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.state}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Country *
                    </label>
                    <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.country
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    >
                        <option value="Singapore">Singapore</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="Thailand">Thailand</option>
                        <option value="Indonesia">Indonesia</option>
                        <option value="Philippines">Philippines</option>
                        <option value="Other">Other</option>
                    </select>
                    {validationErrors.country && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.country}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Postal Code *
                    </label>
                    <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        maxLength={10}
                        placeholder={formData.country === 'Singapore' ? '123456' : 'Postal Code'}
                        className={`w-full px-3 py-2 bg-slate-700 border rounded-md focus:outline-none focus:ring-2 text-white ${
                            validationErrors.postalCode
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-600 focus:ring-primary'
                        }`}
                    />
                    {validationErrors.postalCode && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.postalCode}</p>
                    )}
                </div>

                <div className="lg:col-span-3 flex gap-3 pt-4">
                    <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition font-medium"
                    >
                        Create Client
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
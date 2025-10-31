import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../services/authService';
import { clientApi, userApi } from '../services/apiService';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { formatPhoneNumber } from '../utils/phone';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

export default function ClientManagementPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    // Pagination state
    const [page, setPage] = useState(0);
    const LIMIT = 10;
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

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
                const user = userResponse.data.data;
                setCurrentUser(user); // Backend returns { data: UserDTO, message: string }

                // Redirect admin and rootAdministrator away from Client Management
                if (user.role === 'admin' || user.role === 'rootAdministrator') {
                    navigate('/dashboard');
                    return;
                }

                // Load clients (paginated)
                const response = await clientApi.getAllClients(page, LIMIT);
                const pageData = response.data.data;
                if (Array.isArray(pageData)) {
                    // Backward compatibility (if backend temporarily returns list)
                    setClients(pageData);
                    setTotalPages(1);
                    setTotalElements(pageData.length);
                } else {
                    setClients(pageData?.content || []);
                    setTotalPages(pageData?.totalPages || 0);
                    setTotalElements(pageData?.totalElements || 0);
                }
                setLoading(false);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load data');
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, page]);

    // Open create client form if navigation state is set, and clear state after opening
    useEffect(() => {
        if (location.state && location.state.openCreateForm) {
            setShowCreateForm(true);
            // Clear navigation state so it doesn't persist on refresh
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Helper function to convert country name to ISO country code (used in handleCreateClient)
    const getCountryCodeForPhone = (countryName) => {
        const countryMap = {
            'Singapore': 'SG',
            'United States': 'US',
            'United Kingdom': 'GB',
            'Malaysia': 'MY',
            'Indonesia': 'ID',
            'Thailand': 'TH',
            'Philippines': 'PH',
            'Vietnam': 'VN',
            'India': 'IN',
            'China': 'CN',
            'Australia': 'AU',
            'New Zealand': 'NZ',
            'Canada': 'CA',
            'Germany': 'DE',
            'France': 'FR',
            'Japan': 'JP',
            'South Korea': 'KR'
        };
        return countryMap[countryName] || undefined;
    };

    const handleCreateClient = async (clientData) => {
        try {
            // Normalize phone number using libphonenumber-js
            let normalizedPhoneNumber = clientData.phoneNumber;
            try {
                const cleanValue = clientData.phoneNumber.replace(/\s/g, '');
                const countryCode = getCountryCodeForPhone(clientData.country);
                const phoneNumber = parsePhoneNumberFromString(cleanValue, countryCode);
                
                if (phoneNumber) {
                    // Extract digits with country code: countryCallingCode + nationalNumber
                    normalizedPhoneNumber = phoneNumber.countryCallingCode + phoneNumber.nationalNumber;
                } else {
                    // Fallback: strip non-digits if parsing fails
                    normalizedPhoneNumber = cleanValue.replace(/\D/g, '');
                }
            } catch (err) {
                // Fallback: strip non-digits if parsing fails
                normalizedPhoneNumber = clientData.phoneNumber.replace(/\D/g, '');
            }

            const normalizedData = {
                ...clientData,
                phoneNumber: normalizedPhoneNumber
            };
            await clientApi.createClient(normalizedData);
            // After creating, reset to first page and refresh
            setPage(0);
            const response = await clientApi.getAllClients(0, LIMIT, Date.now());
            const pageData = response.data.data;
            setClients(pageData?.content || pageData || []);
            setTotalPages(pageData?.totalPages || 0);
            setTotalElements(pageData?.totalElements || (Array.isArray(pageData) ? pageData.length : 0));
            setShowCreateForm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create client');
        }
    };

    const handleVerifyClient = async (clientId) => {
        try {
            await clientApi.verifyClient(clientId);
            // Refresh current page with cache busting
            const response = await clientApi.getAllClients(page, LIMIT, Date.now());
            const pageData = response.data.data;
            setClients(pageData?.content || pageData || []);
            setTotalPages(pageData?.totalPages || totalPages);
            setTotalElements(pageData?.totalElements || totalElements);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify client');
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (window.confirm('Are you sure you want to delete this client?')) {
            try {
                await clientApi.deleteClient(clientId);
                // If last item on page was deleted and page becomes empty, go to previous page if possible
                const newPage = Math.max(page - (clients.length === 1 && page > 0 ? 1 : 0), 0);
                setPage(newPage);
                const response = await clientApi.getAllClients(newPage, LIMIT, Date.now());
                const pageData = response.data.data;
                setClients(pageData?.content || pageData || []);
                setTotalPages(pageData?.totalPages || totalPages);
                setTotalElements(pageData?.totalElements || totalElements);
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
                                                {client.fullName || `${client.firstName || ''} ${client.lastName || ''}`}
                                            </td>
                                            <td className="p-4 text-slate-300">{client.email}</td>
                                            <td className="p-4 text-slate-300">{formatPhoneNumber(client.phoneNumber, 'SG')}</td>
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
                        <div className="flex items-center justify-between p-4 border-t border-slate-700">
                            <div className="text-slate-400 text-sm">
                                Showing page {page + 1} of {Math.max(totalPages, 1)} ({totalElements} total)
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(p - 1, 0))}
                                    disabled={page === 0}
                                    className={`px-3 py-1 text-sm rounded ${page === 0 ? 'bg-slate-700 text-slate-500' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
                                >
                                    Previous
                                </button>
                                {/* Page size fixed to 10 per backend clamp; selector removed */}
                                <button
                                    onClick={() => setPage((p) => Math.min(p + 1, Math.max(totalPages - 1, 0)))}
                                    disabled={page >= totalPages - 1}
                                    className={`px-3 py-1 text-sm rounded ${page >= totalPages - 1 ? 'bg-slate-700 text-slate-500' : 'bg-slate-600 text-white hover:bg-slate-500'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
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
    const [submitError, setSubmitError] = useState(null);

    // Helper function to convert country name to ISO country code
    const getCountryCode = (countryName) => {
        const countryMap = {
            'Singapore': 'SG',
            'United States': 'US',
            'United Kingdom': 'GB',
            'Malaysia': 'MY',
            'Indonesia': 'ID',
            'Thailand': 'TH',
            'Philippines': 'PH',
            'Vietnam': 'VN',
            'India': 'IN',
            'China': 'CN',
            'Australia': 'AU',
            'New Zealand': 'NZ',
            'Canada': 'CA',
            'Germany': 'DE',
            'France': 'FR',
            'Japan': 'JP',
            'South Korea': 'KR'
        };
        return countryMap[countryName] || undefined;
    };

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
                    let age = today.getFullYear() - birthDate.getFullYear();
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
                } else {
                    // Remove spaces for validation
                    const cleanValue = value.replace(/\s/g, '');
                    // Map country name to ISO country code (default to SG for Singapore)
                    const countryCode = formData.country === 'Singapore' ? 'SG' : 
                                      formData.country ? getCountryCode(formData.country) : 'SG';
                    
                    // Use libphonenumber to validate the phone number
                    if (!isValidPhoneNumber(cleanValue, countryCode)) {
                        errors[name] = 'Please enter a valid phone number';
                    }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError(null);
        // Validate all fields
        let allErrors = {};
        Object.keys(formData).forEach(key => {
            const fieldErrors = validateField(key, formData[key]);
            allErrors = { ...allErrors, ...fieldErrors };
        });

        setValidationErrors(allErrors);

        // If no errors, submit the form
        if (Object.keys(allErrors).length === 0) {
            try {
                await onSubmit(formData);
            } catch (err) {
                setSubmitError(err?.response?.data?.message || err?.message || 'Failed to create client');
            }
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
            {submitError && (
                <div className="mb-4 bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md">
                    {submitError}
                    <button
                        onClick={() => setSubmitError(null)}
                        className="float-right text-red-300 hover:text-red-100"
                    >
                        ×
                    </button>
                </div>
            )}
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
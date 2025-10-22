// Date formatting utilities
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-SG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-SG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Currency formatting
export const formatCurrency = (amount, currency = 'SGD') => {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Form validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Singapore phone number validation (8-9 digits, optionally with +65)
  const phoneRegex = /^(\+65)?[689]\d{7}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validatePostalCode = (postalCode, country = 'Singapore') => {
  if (country === 'Singapore') {
    // Singapore postal code: 6 digits
    return /^\d{6}$/.test(postalCode);
  }
  // Add other country validations as needed
  return postalCode.length >= 4 && postalCode.length <= 10;
};

export const validateDateOfBirth = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 18 && age <= 100;
};

// String utilities
export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const formatName = (firstName, lastName) => {
  return `${firstName} ${lastName}`.trim();
};

export const generateClientId = () => {
  // Generate a unique client ID (placeholder - should be handled by backend)
  return `CLI${Date.now().toString().slice(-6)}`;
};

export const generateAccountId = () => {
  // Generate a unique account ID (placeholder - should be handled by backend)
  return `ACC${Date.now().toString().slice(-6)}`;
};

// Status utilities
export const getStatusColor = (status) => {
  const statusColors = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-gray-100 text-gray-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'Failed': 'bg-red-100 text-red-800',
    'Cancelled': 'bg-red-100 text-red-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getRoleColor = (role) => {
  const roleColors = {
    'admin': 'bg-red-100 text-red-800',
    'agent': 'bg-blue-100 text-blue-800',
  };
  
  return roleColors[role] || 'bg-gray-100 text-gray-800';
};

// Local storage utilities
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const getFromLocalStorage = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Failed to get from localStorage:', error);
    return null;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Debounce utility for search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Error handling utilities
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    switch (status) {
      case 400:
        return { type: 'validation', message: 'Invalid data provided' };
      case 401:
        return { type: 'auth', message: 'Authentication required' };
      case 403:
        return { type: 'permission', message: 'Access denied' };
      case 404:
        return { type: 'notfound', message: 'Resource not found' };
      case 500:
        return { type: 'server', message: 'Server error occurred' };
      default:
        return { type: 'unknown', message: message || 'An error occurred' };
    }
  } else if (error.request) {
    // Network error
    return { type: 'network', message: 'Network connection failed' };
  } else {
    // Other error
    return { type: 'unknown', message: error.message || 'An unexpected error occurred' };
  }
};

// Table utilities
export const sortData = (data, key, direction = 'asc') => {
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

export const filterData = (data, searchTerm, searchKeys) => {
  if (!searchTerm) return data;
  
  return data.filter(item =>
    searchKeys.some(key =>
      item[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
};

// Account type utilities
export const getAccountTypeIcon = (accountType) => {
  const icons = {
    'Savings': '💰',
    'Checking': '🏦',
    'Business': '🏢',
  };
  
  return icons[accountType] || '🏦';
};

export const getTransactionTypeIcon = (transactionType) => {
  const icons = {
    'Deposit': '⬆️',
    'Withdrawal': '⬇️',
  };
  
  return icons[transactionType] || '💳';
};

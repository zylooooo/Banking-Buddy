export const formatRole = (role) => {
    switch (role) {
        case 'rootAdministrator':
            return 'Root Admin';
        case 'admin':
            return 'Admin';
        case 'agent':
        case 'agents':
            return 'Agent';
        default:
            // Handle possible enum-like uppercase values used in some components
            if (role === 'ROOT_ADMIN') return 'Root Admin';
            if (role === 'ADMIN') return 'Admin';
            if (role === 'AGENT') return 'Agent';
            return role;
    }
};



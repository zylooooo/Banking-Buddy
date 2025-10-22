import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout, getUserRole } from '../services/authService';

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = React.useState(null);

  React.useEffect(() => {
    const fetchRole = async () => {
      const role = await getUserRole();
      setUserRole(role);
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        path: userRole === 'admin' ? '/admin' : '/agent',
        label: 'Dashboard',
        icon: '📊',
        color: 'blue'
      },
      {
        path: '/clients',
        label: 'Clients',
        icon: '👥',
        color: 'emerald'
      },
      {
        path: '/accounts',
        label: 'Accounts',
        icon: '💳',
        color: 'purple'
      },
      {
        path: '/transactions',
        label: 'Transactions',
        icon: '💰',
        color: 'orange'
      }
    ];

    // Add User Management for admin only
    if (userRole === 'admin') {
      baseItems.push({
        path: '/users',
        label: 'Users',
        icon: '⚙️',
        color: 'red'
      });
    }

    return baseItems;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
                🏦 Scrooge Global Bank
              </h1>
              <span className="ml-3 px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {userRole === 'admin' ? 'Admin Portal' : 'Agent Portal'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white/70 backdrop-blur-sm shadow-sm min-h-screen border-r border-slate-200">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Navigation</h2>
            <ul className="space-y-2">
              {getNavigationItems().map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-3 rounded-lg transition-all duration-200 group ${
                      isActive(item.path)
                        ? `bg-gradient-to-r from-${item.color}-100 to-${item.color}-50 text-${item.color}-800 border border-${item.color}-200`
                        : `text-slate-700 hover:bg-gradient-to-r hover:from-${item.color}-50 hover:to-blue-50 hover:text-${item.color}-700`
                    }`}
                  >
                    <span className={`mr-3 text-${item.color}-600 group-hover:text-${item.color}-700 ${
                      isActive(item.path) ? `text-${item.color}-700` : ''
                    }`}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive(item.path) && (
                      <span className={`ml-auto w-2 h-2 bg-${item.color}-500 rounded-full`}></span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;

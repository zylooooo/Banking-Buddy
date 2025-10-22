import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout, getUserRole } from '../services/authService';

function Layout({ children }) {
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

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const getNavItems = () => {
    const commonItems = [
      { path: '/clients', icon: '👥', label: 'Clients', color: 'emerald' },
      { path: '/accounts', icon: '💳', label: 'Accounts', color: 'blue' },
      { path: '/transactions', icon: '💰', label: 'Transactions', color: 'orange' },
    ];

    if (userRole === 'admin') {
      return [
        { path: '/admin', icon: '📊', label: 'Dashboard', color: 'purple' },
        ...commonItems,
        { path: '/users', icon: '⚙️', label: 'Users', color: 'red' },
      ];
    } else if (userRole === 'agent') {
      return [
        { path: '/agent', icon: '📊', label: 'Dashboard', color: 'emerald' },
        ...commonItems,
      ];
    }
    return [];
  };

  const getColorClasses = (color, isActive) => {
    const colors = {
      purple: isActive 
        ? 'bg-purple-100 text-purple-700 border-r-2 border-purple-500' 
        : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700',
      emerald: isActive 
        ? 'bg-emerald-100 text-emerald-700 border-r-2 border-emerald-500' 
        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700',
      blue: isActive 
        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500' 
        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700',
      orange: isActive 
        ? 'bg-orange-100 text-orange-700 border-r-2 border-orange-500' 
        : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700',
      red: isActive 
        ? 'bg-red-100 text-red-700 border-r-2 border-red-500' 
        : 'text-slate-700 hover:bg-red-50 hover:text-red-700',
    };
    return colors[color] || 'text-slate-700 hover:bg-slate-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="w-full px-4">
          <div className="flex items-center h-16">
            <div className="w-64 flex items-center">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-blue-800 bg-clip-text text-transparent">
                🏦 Scrooge Global Bank
              </h1>
            </div>
            <div className="flex-1 flex justify-end items-center">
              {userRole && (
                <span className={`mr-4 text-sm px-3 py-1 rounded-full ${
                  userRole === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {userRole === 'admin' ? 'Admin Portal' : 'Agent Portal'}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white/70 backdrop-blur-sm shadow-sm min-h-screen border-r border-slate-200">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Navigation</h2>
            <ul className="space-y-1">
              {getNavItems().map((item) => (
                <li key={item.path}>
                  <button 
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                      getColorClasses(item.color, isActive(item.path))
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;

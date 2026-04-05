import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { USERS } from './types';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check local storage for saved session
    const savedUser = localStorage.getItem('auger_user');
    const savedRole = localStorage.getItem('auger_role');
    if (savedUser) {
      setUsername(savedUser);
      setUserRole(savedRole || 'user');
    }
    setIsAuthReady(true);
  }, []);

  const handleLogin = (user: string, role: string) => {
    localStorage.setItem('auger_user', user);
    localStorage.setItem('auger_role', role);
    setUsername(user);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('auger_user');
    localStorage.removeItem('auger_role');
    setUsername(null);
    setUserRole(null);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!username) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard username={username} role={userRole || 'user'} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}

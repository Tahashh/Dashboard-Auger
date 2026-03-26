import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check local storage for saved session
    const savedUser = localStorage.getItem('auger_user');
    if (savedUser) {
      setUsername(savedUser);
    }
    setIsAuthReady(true);
  }, []);

  const handleLogin = (user: string) => {
    localStorage.setItem('auger_user', user);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auger_user');
    setUsername(null);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!username) {
    return (
      <>
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Dashboard username={username} onLogout={handleLogout} />
    </>
  );
}

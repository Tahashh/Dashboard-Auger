import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('auger_user');
    if (storedUser) {
      setUsername(storedUser);
    }
  }, []);

  const handleLogin = (user: string) => {
    setUsername(user);
    localStorage.setItem('auger_user', user);
  };

  const handleLogout = () => {
    setUsername(null);
    localStorage.removeItem('auger_user');
  };

  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard username={username} onLogout={handleLogout} />;
}

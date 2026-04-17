import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import PolicyModal from './components/PolicyModal';
import BillingError from './components/BillingError';
import { USERS } from './types';

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); // Stato di blocco applicazione

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

  if (isBlocked) {
    return <BillingError />;
  }

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (!username) {
    return (
      <ErrorBoundary>
        <PolicyModal />
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <PolicyModal />
      <div className="flex-grow">
        <ErrorBoundary>
          <Dashboard username={username} role={userRole || 'user'} onLogout={handleLogout} />
        </ErrorBoundary>
      </div>
      
      {/* Floating Debug Panel */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {showDebug && (
          <div className="bg-white text-slate-800 p-4 rounded-lg shadow-xl border border-slate-300 text-xs max-w-xs whitespace-pre-line">
            {`You are an efficiency-optimized AI. Your goal is to minimize token usage.

STRICT RULES:
- Be concise, direct, compact.
- No intros, conclusions, filler.
- Do not restate question.
- Prefer bullet points/short lines.
- Minimum words possible.
- Output: short.

CODE RULES:
- Output only code.
- No explanations unless asked.
- No comments.
- Minimal, compressed code.

HTML RULES:
- Minify HTML.
- Shortest valid syntax.

LOGIC:
- Default: ultra-short.
- "EXPAND": more detail.
- "MIN": compress further.
- Unclear: single short question.

GOAL: Maximize info/token. Minimize length.`}
          </div>
        )}
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="bg-black text-white px-3 py-1.5 rounded text-xs cursor-pointer hover:bg-slate-800 transition-colors"
        >
          risp. token
        </button>
      </div>
    </div>
  );
}

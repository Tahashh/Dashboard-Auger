import { useState, FormEvent } from 'react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Errore di login');
        return;
      }

      onLogin(data.username);
    } catch (err) {
      setError('Errore di connessione al server');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <div className={`cabinet ${isOpen ? 'open' : ''}`}>
          <div className="door left" onClick={() => setIsOpen(true)}>
            {!isOpen && (
              <div className="absolute inset-0 flex items-center justify-end pr-2 text-slate-300 opacity-50">
                <span className="text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>AUGER</span>
              </div>
            )}
          </div>
          <div className="door right" onClick={() => setIsOpen(true)}>
            {!isOpen && (
              <div className="absolute inset-0 flex items-center justify-start pl-2 text-slate-300 opacity-50">
                <span className="text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>DASHBOARD</span>
              </div>
            )}
          </div>
          
          <form className="login-panel" onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px' }}>AUGER</h2>
            
            {error && (
              <div style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '5px', textAlign: 'center', padding: '0 20px' }}>
                {error}
              </div>
            )}
            
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <button type="submit" style={{ marginTop: '10px' }}>Accedi</button>
          </form>
        </div>
      </div>
    </div>
  );
}

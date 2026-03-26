import { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Fetch version.json with cache busting
        const res = await fetch(`/version.json?t=${new Date().getTime()}`, {
          cache: 'no-store'
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        const serverVersion = data.version;
        
        if (!serverVersion) return; // Ignore if version is missing or invalid

        const localVersion = localStorage.getItem('app_version');

        if (!localVersion || localVersion === 'undefined') {
          // First visit, save the version
          localStorage.setItem('app_version', serverVersion);
        } else if (serverVersion !== localVersion) {
          // New version available
          setNewVersion(serverVersion);
          setUpdateAvailable(true);
        }
      } catch (error) {
        // Silent fallback on error
        console.error('Failed to check version:', error);
      }
    };

    // Check immediately on load
    checkVersion();

    // Check every 30 seconds to ensure active users get notified quickly
    const intervalId = setInterval(checkVersion, 30000);

    // Listen for messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_APP') {
        // Fetch the latest version and update automatically
        fetch(`/version.json?t=${new Date().getTime()}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(data => {
            if (data.version) {
              localStorage.setItem('app_version', data.version);
              window.location.reload();
            }
          })
          .catch(err => console.error('Failed to update from SW message:', err));
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    // Also check if opened with ?update=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('update') === 'true') {
      fetch(`/version.json?t=${new Date().getTime()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.version) {
            localStorage.setItem('app_version', data.version);
            // Remove the query parameter
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        });
    }

    return () => {
      clearInterval(intervalId);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, []);

  const handleUpdate = () => {
    // Update the local version
    if (newVersion) {
      localStorage.setItem('app_version', newVersion);
    }
    
    // Force reload bypassing cache
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300">
        <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <RefreshCw className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Aggiornamento Richiesto</h3>
        <p className="text-slate-600 mb-8">
          È stata appena rilasciata una nuova versione dell'applicazione. 
          Per continuare a lavorare ed evitare errori di sincronizzazione, 
          è necessario aggiornare la pagina.
        </p>
        <button
          onClick={handleUpdate}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-4 rounded-xl font-bold transition-colors text-lg shadow-lg shadow-indigo-200"
        >
          <RefreshCw className="h-5 w-5" />
          Aggiorna Ora
        </button>
      </div>
    </div>
  );
}

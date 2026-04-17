import { useState, useEffect } from 'react';

export default function PolicyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const isAccepted = localStorage.getItem('policyAccepted');
    console.log('Policy accepted status:', isAccepted);
    if (!isAccepted) {
      console.log('Opening policy modal');
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('policyAccepted', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white p-8 rounded-lg max-w-lg w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-slate-900">Termini e Privacy - DASHBOARD AUGER</h2>

        <div className="max-h-48 overflow-y-auto mb-6 text-sm text-slate-700 space-y-3 pr-2">
          <p><strong>Utilizzo interno aziendale:</strong> questa dashboard è destinata esclusivamente all’uso interno.</p>
          <p>I dati inseriti sono utilizzati solo per gestione produzione e magazzino.</p>
          <p>Non condividiamo dati con terze parti.</p>
          <p>L’utente è responsabile dei dati inseriti.</p>
        </div>

        <label className="flex items-center gap-2 mb-6 cursor-pointer">
          <input 
            type="checkbox" 
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="h-4 w-4 text-slate-800 focus:ring-slate-500 border-gray-300 rounded"
          />
          <span className="text-sm text-slate-700">Accetto i Termini e la Privacy Policy</span>
        </label>

        <button 
          onClick={handleAccept}
          disabled={!accepted}
          className="w-full py-2.5 bg-slate-800 text-white rounded font-semibold hover:bg-slate-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Accetto
        </button>
      </div>
    </div>
  );
}

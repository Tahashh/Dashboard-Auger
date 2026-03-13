import { useState } from 'react';
import { Article } from '../types';
import { ArrowRightLeft, Plus, Minus, Edit3, PackageCheck } from 'lucide-react';
import clsx from 'clsx';

interface ProductionMovementProps {
  articles: Article[];
  onUpdate: () => void;
}

export default function ProductionMovement({ articles, onUpdate }: ProductionMovementProps) {
  const [articoloId, setArticoloId] = useState<string>('');
  const [fase, setFase] = useState<string>('taglio');
  const [tipo, setTipo] = useState<string>('carico');
  const [quantita, setQuantita] = useState<number | ''>('');
  
  // Scarico Commessa state
  const [commessaDaScaricare, setCommessaDaScaricare] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fase === 'impegni') {
      if (!commessaDaScaricare) return;
      
      setLoading(true);
      setMessage({ text: '', type: '' });

      try {
        const res = await fetch('/api/commitments/fulfill-by-commessa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commessa: commessaDaScaricare })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore durante lo scarico della commessa');

        setMessage({ text: 'Commessa evasa con successo!', type: 'success' });
        setCommessaDaScaricare('');
        onUpdate();
        
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      } catch (error: any) {
        setMessage({ text: error.message || 'Errore nello scarico commessa', type: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard movement
    if (!articoloId || !quantita) return;

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolo_id: parseInt(articoloId),
          fase,
          tipo,
          quantita: parseInt(quantita.toString())
        })
      });

      if (!res.ok) throw new Error('Errore durante la registrazione');

      setMessage({ text: 'Movimento registrato con successo!', type: 'success' });
      setQuantita('');
      onUpdate();
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Errore nella registrazione del movimento', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Registra Movimento</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fase / Reparto</label>
          <select 
            value={fase}
            onChange={(e) => setFase(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="taglio">Taglio</option>
            <option value="piega">Piega</option>
            <option value="verniciatura">Verniciatura</option>
            <option value="impegni">Impegni Clienti (Scarico Commessa)</option>
          </select>
        </div>

        {fase === 'impegni' ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-2">
            <div className="flex items-center gap-2 mb-3 text-indigo-800">
              <PackageCheck className="h-5 w-5" />
              <h3 className="font-bold">Scarico Commessa</h3>
            </div>
            <p className="text-xs text-indigo-600 mb-4">
              Inserisci il numero di commessa per evadere automaticamente tutti gli articoli associati.
              I pezzi verranno scalati dalla disponibilità e dal magazzino verniciati.
            </p>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Numero Commessa</label>
              <input 
                type="text" 
                value={commessaDaScaricare}
                onChange={(e) => setCommessaDaScaricare(e.target.value)}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Es. C-1234"
                required
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Articolo</label>
              <select 
                value={articoloId}
                onChange={(e) => setArticoloId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                required
              >
                <option value="">Seleziona un articolo...</option>
                {articles.map(a => (
                  <option key={a.id} value={a.id}>{a.nome} ({a.codice})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantità</label>
              <input 
                type="number" 
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="Es. 100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Operazione</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('carico')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'carico' ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Plus className="h-4 w-4 mb-1" />
                  Carico
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('scarico')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'scarico' ? "bg-amber-50 border-amber-200 text-amber-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Minus className="h-4 w-4 mb-1" />
                  Scarico
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('rettifica')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'rettifica' ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Edit3 className="h-4 w-4 mb-1" />
                  Rettifica
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-auto pt-4">
          {message.text && (
            <div className={clsx(
              "mb-3 p-2 rounded text-sm text-center font-medium",
              message.type === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}>
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (fase === 'impegni' ? !commessaDaScaricare : (!articoloId || !quantita))}
            className={clsx(
              "w-full text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              fase === 'impegni' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {loading ? 'Elaborazione...' : (fase === 'impegni' ? 'Scarica Commessa' : 'Conferma Movimento')}
          </button>
        </div>
      </form>
    </div>
  );
}

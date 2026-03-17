import React, { useState, useEffect } from 'react';
import { Article, Client, AUTHORIZED_USERS } from '../types';
import { Plus, Package } from 'lucide-react';
import { getDisponibilita } from '../utils';
import { toast } from 'react-hot-toast';

interface RegisterCommitmentProps {
  articles: Article[];
  onUpdate: () => void;
  username: string;
}

export default function RegisterCommitment({ articles, onUpdate, username }: RegisterCommitmentProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [articoloId, setArticoloId] = useState<string>('');
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [quantita, setQuantita] = useState<number | ''>('');
  const [faseProduzione, setFaseProduzione] = useState('Generico');
  const [statoLavorazione, setStatoLavorazione] = useState('Pianificato');
  const [note, setNote] = useState('');

  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !articoloId || !cliente || !commessa || !quantita) return;

    setLoading(true);
    try {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolo_id: parseInt(articoloId),
          cliente,
          commessa,
          quantita: parseInt(quantita.toString()),
          fase_produzione: faseProduzione,
          operatore: username,
          note,
          stato_lavorazione: statoLavorazione
        })
      });

      if (!res.ok) throw new Error('Errore durante la registrazione');

      toast.success('Impegno registrato con successo!');
      
      // Reset form
      setArticoloId('');
      setCliente('');
      setCommessa('');
      setQuantita('');
      setFaseProduzione('Generico');
      setStatoLavorazione('Pianificato');
      setNote('');
      
      onUpdate();
    } catch (error) {
      toast.error('Errore nella registrazione dell\'impegno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Package className="h-5 w-5 text-indigo-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Registra Impegno</h2>
      </div>

      {!isAuthorized ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
          Non hai i permessi necessari per aggiungere nuovi impegni.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
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
                <option key={a.id} value={a.id}>{a.nome} ({a.codice}) - Disp: {getDisponibilita(a)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            {clients.length === 0 ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                Nessun cliente registrato.
              </div>
            ) : (
              <select 
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                required
              >
                <option value="">Seleziona un cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Commessa</label>
              <input 
                type="text" 
                value={commessa}
                onChange={(e) => setCommessa(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="Es. C-1234"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantità</label>
              <input 
                type="number" 
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="Es. 50"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fase Produzione</label>
              <select 
                value={faseProduzione}
                onChange={(e) => setFaseProduzione(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="Generico">Generico</option>
                <option value="Taglio">Taglio</option>
                <option value="Piega">Piega</option>
                <option value="Saldatura">Saldatura</option>
                <option value="Verniciatura">Verniciatura</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stato Lavorazione</label>
              <select 
                value={statoLavorazione}
                onChange={(e) => setStatoLavorazione(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="Pianificato">Pianificato</option>
                <option value="In Lavorazione">In Lavorazione</option>
                <option value="Completato">Completato</option>
                <option value="Annullato">Annullato</option>
              </select>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={loading || !articoloId || !cliente || !commessa || !quantita}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Elaborazione...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Registra Impegno
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

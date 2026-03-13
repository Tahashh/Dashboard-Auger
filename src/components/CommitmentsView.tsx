import { useState, useEffect } from 'react';
import { Article, Commitment, Client, AUTHORIZED_USERS } from '../types';
import { Plus, CheckCircle2, Trash2, Package } from 'lucide-react';

interface CommitmentsViewProps {
  articles: Article[];
  onUpdate: () => void;
  username: string;
}

export default function CommitmentsView({ articles, onUpdate, username }: CommitmentsViewProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [articoloId, setArticoloId] = useState<string>('');
  const [cliente, setCliente] = useState('');
  const [commessa, setCommessa] = useState('');
  const [quantita, setQuantita] = useState<number | ''>('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const fetchData = async () => {
    try {
      const [commitmentsRes, clientsRes] = await Promise.all([
        fetch('/api/commitments'),
        fetch('/api/clients')
      ]);
      
      const commitmentsData = await commitmentsRes.json();
      const clientsData = await clientsRes.json();
      
      setCommitments(commitmentsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !articoloId || !cliente || !commessa || !quantita) return;

    try {
      const res = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolo_id: parseInt(articoloId),
          cliente,
          commessa,
          quantita: parseInt(quantita.toString())
        })
      });

      if (!res.ok) throw new Error('Errore durante la registrazione');

      setMessage({ text: 'Impegno registrato con successo!', type: 'success' });
      setCliente('');
      setCommessa('');
      setQuantita('');
      
      fetchData();
      onUpdate();
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: 'Errore nella registrazione', type: 'error' });
    }
  };

  const handleFulfill = async (id: number) => {
    if (!confirm('Sei sicuro di voler evadere questo impegno? I pezzi verranno scalati dalla disponibilità.')) return;
    
    try {
      await fetch(`/api/commitments/${id}/fulfill`, {
        method: 'POST'
      });
      fetchCommitments();
      onUpdate();
    } catch (error) {
      console.error("Error fulfilling commitment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Plus className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nuovo Impegno</h2>
        </div>

        {!isAuthorized ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
            Non hai i permessi necessari per aggiungere nuovi impegni.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                <option key={a.id} value={a.id}>{a.nome} ({a.codice}) - Disp: {a.verniciati - a.impegni_clienti}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            {clients.length === 0 ? (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                Nessun cliente registrato. Aggiungi un cliente dalla sezione "Clienti" nel menu.
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

            <div className="mt-4">
              {message.text && (
                <div className={`mb-3 p-2 rounded text-sm text-center font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {message.text}
                </div>
              )}
              <button
                type="submit"
                disabled={!articoloId || !cliente || !commessa || !quantita}
                className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registra Impegno
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table Section */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-600" />
            <h2 className="font-bold text-slate-800">Elenco Impegni Attivi</h2>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Totale: {commitments.length}
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
            </div>
          ) : commitments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Package className="h-12 w-12 mb-2 opacity-20" />
              <p>Nessun impegno attivo.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Cliente / Commessa</th>
                  <th className="px-4 py-3 font-semibold">Articolo</th>
                  <th className="px-4 py-3 font-semibold text-center">Q.tà</th>
                  {isAuthorized && <th className="px-4 py-3 font-semibold text-center">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commitments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(c.data_inserimento)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.cliente}</div>
                      <div className="text-xs text-slate-500 font-mono">{c.commessa}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.articolo_nome}</div>
                      <div className="text-xs text-slate-500">{c.articolo_codice}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-bold">
                        {c.quantita}
                      </span>
                    </td>
                    {isAuthorized && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleFulfill(c.id)}
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                          title="Evadi impegno (scala pezzi)"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Evadi
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

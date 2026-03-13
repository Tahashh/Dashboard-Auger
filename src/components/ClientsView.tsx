import { useState, useEffect } from 'react';
import { Client, AUTHORIZED_USERS } from '../types';
import { Users, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface ClientsViewProps {
  username: string;
}

export default function ClientsView({ username }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !nome.trim()) return;

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la registrazione');

      setMessage({ text: 'Cliente aggiunto con successo!', type: 'success' });
      setNome('');
      fetchClients();
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error: any) {
      setMessage({ text: error.message || 'Errore nella registrazione', type: 'error' });
    }
  };

  const handleUpdate = async (id: number) => {
    if (!isAuthorized || !editNome.trim()) return;

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: editNome.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la modifica');

      setMessage({ text: 'Cliente aggiornato con successo!', type: 'success' });
      setEditingId(null);
      fetchClients();
      
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error: any) {
      setMessage({ text: error.message || 'Errore nella modifica', type: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAuthorized || !confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Errore durante l\'eliminazione');
      
      fetchClients();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const startEditing = (client: Client) => {
    if (!isAuthorized) return;
    setEditingId(client.id);
    setEditNome(client.nome);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditNome('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-fit">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Nuovo Cliente</h2>
        </div>

        {!isAuthorized ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
            Non hai i permessi necessari per aggiungere o modificare i clienti.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Cliente</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              placeholder="Es. Mario Rossi S.p.A."
              required
            />
          </div>

            <div className="mt-2">
              {message.text && (
                <div className={`mb-3 p-2 rounded text-sm text-center font-medium ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {message.text}
                </div>
              )}
              <button
                type="submit"
                disabled={!nome.trim()}
                className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Aggiungi Cliente
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table Section */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h2 className="font-bold text-slate-800">Anagrafica Clienti</h2>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Totale: {clients.length}
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Users className="h-12 w-12 mb-2 opacity-20" />
              <p>Nessun cliente registrato.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Nome Cliente</th>
                  {isAuthorized && <th className="px-4 py-3 font-semibold text-right">Azioni</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="w-full border border-indigo-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          autoFocus
                        />
                      ) : (
                        <div className="font-medium text-slate-900">{c.nome}</div>
                      )}
                    </td>
                    {isAuthorized && (
                      <td className="px-4 py-3 text-right">
                        {editingId === c.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleUpdate(c.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                              title="Salva"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                              title="Annulla"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditing(c)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Modifica"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
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

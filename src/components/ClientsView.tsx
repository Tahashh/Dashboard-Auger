import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { Users, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { fetchClients, addClient, updateClient, deleteClient } from '../api';
import toast from 'react-hot-toast';

interface ClientsViewProps {
  username: string;
  isAuthorized: boolean;
}

export default function ClientsView({ username, isAuthorized }: ClientsViewProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !nome.trim()) return;

    try {
      await addClient({ 
        nome: nome.trim(),
        data_inserimento: new Date().toISOString()
      });
      toast.success('Cliente aggiunto con successo!');
      setNome('');
      loadClients();
    } catch (error: any) {
      console.error(error);
      toast.error('Errore nella registrazione');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!isAuthorized || !editNome.trim()) return;

    try {
      await updateClient(id, { nome: editNome.trim() });
      toast.success('Cliente aggiornato con successo!');
      setEditingId(null);
      loadClients();
    } catch (error: any) {
      console.error(error);
      toast.error('Errore nella modifica');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAuthorized) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Conferma Eliminazione',
      message: 'Sei sicuro di voler eliminare questo cliente?',
      onConfirm: async () => {
        try {
          await deleteClient(id);
          toast.success('Cliente eliminato con successo!');
          loadClients();
        } catch (error: any) {
          console.error(error);
          toast.error('Errore durante l\'eliminazione');
        }
      }
    });
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
    <>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-1 bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 h-fit transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Nuovo Cliente</h2>
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
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-lg shadow-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Anagrafica Clienti</h2>
          </div>
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
            Totale: {clients.length}
          </div>
        </div>

        <div className="overflow-x-auto flex-1 custom-scrollbar">
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
    </>
  );
}

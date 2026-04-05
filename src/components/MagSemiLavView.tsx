import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, PlusCircle, CheckCircle, Edit2, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Traverse {
  id: number;
  tipo: string;
  misura: number;
  quantita: number;
}

export default function MagSemiLavView() {
  const [traverse, setTraverse] = useState<Traverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [caricoForm, setCaricoForm] = useState({ tipo: 'forata', misura: 300, quantita: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ tipo: '', misura: 0, quantita: 0 });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/traverse');
      const data = await res.json();
      setTraverse(data);
    } catch (error) {
      toast.error("Errore nel caricamento traverse");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCarico = async () => {
    try {
      const res = await fetch('/api/traverse/carico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caricoForm)
      });
      if (res.ok) {
        toast.success("Carico effettuato");
        fetchData();
      } else {
        toast.error("Errore nel carico");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  const handleEdit = (t: Traverse) => {
    setEditingId(t.id);
    setEditForm({ tipo: t.tipo, misura: t.misura, quantita: t.quantita });
  };

  const handleSaveEdit = async (id: number) => {
    try {
      const res = await fetch(`/api/traverse/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        toast.success("Riga aggiornata");
        setEditingId(null);
        fetchData();
      } else {
        toast.error("Errore nell'aggiornamento (forse tipo e misura già esistono?)");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  const handleDelete = async (id: number) => {
    // We use a custom modal or direct delete since window.confirm isn't ideal in iframe
    // For internal tools, a direct delete with a toast is often acceptable, but we can just do it
    try {
      const res = await fetch(`/api/traverse/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Riga eliminata");
        fetchData();
      } else {
        toast.error("Errore nell'eliminazione");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  return (
    <div className="p-6 space-y-8 bg-slate-50 min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-blue-600" />
          Mag. Semi Lav. D'acquisto (Traverse)
        </h2>
        
        <div className="flex gap-4 items-center mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <select value={caricoForm.tipo} onChange={(e) => setCaricoForm({...caricoForm, tipo: e.target.value})} className="border border-slate-300 rounded-lg p-2">
            <option value="forata">Forata</option>
            <option value="cieca">Cieca</option>
            <option value="tetto1">Tetto 1</option>
            <option value="tetto2">Tetto 2</option>
          </select>
          <input type="number" value={caricoForm.misura} onChange={(e) => setCaricoForm({...caricoForm, misura: parseInt(e.target.value) || 0})} placeholder="Misura" className="border border-slate-300 rounded-lg p-2 w-24" />
          <input type="number" value={caricoForm.quantita} onChange={(e) => setCaricoForm({...caricoForm, quantita: parseInt(e.target.value) || 0})} placeholder="Quantità" className="border border-slate-300 rounded-lg p-2 w-24" />
          <button onClick={handleCarico} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Carica
          </button>
          <button onClick={fetchData} className="text-slate-500 hover:text-slate-800">
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
              <th className="p-3 border">Tipo</th>
              <th className="p-3 border">Misura</th>
              <th className="p-3 border text-center">Quantità</th>
              <th className="p-3 border text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {traverse.map(t => (
              <tr key={t.id} className="border-b hover:bg-slate-50">
                <td className="p-3 border font-medium">
                  {editingId === t.id ? (
                    <select 
                      value={editForm.tipo} 
                      onChange={(e) => setEditForm({...editForm, tipo: e.target.value})} 
                      className="border border-slate-300 rounded p-1 w-full"
                    >
                      <option value="forata">Forata</option>
                      <option value="cieca">Cieca</option>
                      <option value="tetto1">Tetto 1</option>
                      <option value="tetto2">Tetto 2</option>
                    </select>
                  ) : (
                    t.tipo
                  )}
                </td>
                <td className="p-3 border font-mono">
                  {editingId === t.id ? (
                    <input
                      type="number"
                      value={editForm.misura}
                      onChange={(e) => setEditForm({...editForm, misura: parseInt(e.target.value) || 0})}
                      className="border border-slate-300 rounded p-1 w-24"
                    />
                  ) : (
                    t.misura
                  )}
                </td>
                <td className="p-3 border text-center font-bold text-blue-600">
                  {editingId === t.id ? (
                    <input
                      type="number"
                      value={editForm.quantita}
                      onChange={(e) => setEditForm({...editForm, quantita: parseInt(e.target.value) || 0})}
                      className="border border-slate-300 rounded p-1 w-20 text-center"
                    />
                  ) : (
                    t.quantita
                  )}
                </td>
                <td className="p-3 border text-center">
                  {editingId === t.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleSaveEdit(t.id)} className="text-emerald-600 hover:text-emerald-800">
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => handleEdit(t)} className="text-slate-400 hover:text-blue-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

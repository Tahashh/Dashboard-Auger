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
  const [scaricoForm, setScaricoForm] = useState({ tipo: 'forata', misura: 300, quantita: 0 });
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
    if (caricoForm.quantita <= 0) {
      toast.error("Inserisci una quantità valida");
      return;
    }
    try {
      const res = await fetch('/api/traverse/carico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caricoForm)
      });
      if (res.ok) {
        toast.success("Carico effettuato");
        setCaricoForm({ ...caricoForm, quantita: 0 });
        fetchData();
      } else {
        toast.error("Errore nel carico");
      }
    } catch (error) {
      toast.error("Errore di connessione");
    }
  };

  const handleScarico = async () => {
    if (scaricoForm.quantita <= 0) {
      toast.error("Inserisci una quantità valida");
      return;
    }
    try {
      const res = await fetch('/api/traverse/scarico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scaricoForm)
      });
      if (res.ok) {
        toast.success("Scarico effettuato");
        setScaricoForm({ ...scaricoForm, quantita: 0 });
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Errore nello scarico");
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <PlusCircle className="h-6 w-6 text-emerald-600" />
            Carico Traverse
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Tipo</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  value={caricoForm.tipo}
                  onChange={(e) => setCaricoForm({ ...caricoForm, tipo: e.target.value })}
                >
                  <option value="forata">Forata</option>
                  <option value="cieca">Cieca</option>
                  <option value="tetto">Trav. Tetto</option>
                  <option value="TRA. LAT. AGS">TRA. LAT. AGS</option>
                </select>
              </div>
              <div className="w-32">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Misura (mm)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  value={caricoForm.misura}
                  onChange={(e) => setCaricoForm({ ...caricoForm, misura: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Quantità</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                value={caricoForm.quantita}
                onChange={(e) => setCaricoForm({ ...caricoForm, quantita: parseInt(e.target.value) || 0 })}
              />
            </div>
            <button 
              onClick={handleCarico}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle className="h-5 w-5" />
              REGISTRA CARICO
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-600" />
            Scarico Traverse
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Tipo</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  value={scaricoForm.tipo}
                  onChange={(e) => setScaricoForm({ ...scaricoForm, tipo: e.target.value })}
                >
                  <option value="forata">Forata</option>
                  <option value="cieca">Cieca</option>
                  <option value="tetto">Trav. Tetto</option>
                  <option value="TRA. LAT. AGS">TRA. LAT. AGS</option>
                </select>
              </div>
              <div className="w-32">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Misura (mm)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                  value={scaricoForm.misura}
                  onChange={(e) => setScaricoForm({ ...scaricoForm, misura: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Quantità</label>
              <input 
                type="number" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                value={scaricoForm.quantita}
                onChange={(e) => setScaricoForm({ ...scaricoForm, quantita: parseInt(e.target.value) || 0 })}
              />
            </div>
            <button 
              onClick={handleScarico}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              <Trash2 className="h-5 w-5" />
              REGISTRA SCARICO
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Inventario Traverse
          </h2>
          <button onClick={fetchData} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
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
                      <option value="tetto">Trav. Tetto</option>
                      <option value="TRA. LAT. AGS">TRA. LAT. AGS</option>
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

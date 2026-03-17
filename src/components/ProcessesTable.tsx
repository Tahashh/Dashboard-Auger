import { useState } from 'react';
import { Process } from '../types';
import { Edit2, Check, X } from 'lucide-react';

interface ProcessesTableProps {
  processes: Process[];
  onUpdate: () => void;
}

export default function ProcessesTable({ processes, onUpdate }: ProcessesTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    taglio: 0,
    piega: 0,
    verniciatura: 0
  });

  const handleUpdate = async (id: number) => {
    try {
      await fetch(`/api/processes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating process:", error);
    }
  };

  const startEdit = (process: Process) => {
    setEditingId(process.id);
    setFormData({
      taglio: process.taglio || 0,
      piega: process.piega || 0,
      verniciatura: process.verniciatura || 0
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Processi Aziendali
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">Articolo</th>
              <th className="px-4 py-3 font-semibold text-center">Taglio</th>
              <th className="px-4 py-3 font-semibold text-center">Piega</th>
              <th className="px-4 py-3 font-semibold text-center">Verniciatura</th>
              <th className="px-4 py-3 font-semibold text-center w-16">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {processes.map((process) => {
              const isEditing = editingId === process.id;

              if (isEditing) {
                return (
                  <tr key={process.id} className="bg-blue-50/50">
                    <td className="px-4 py-2 font-medium text-slate-900">
                      {process.articolo_nome}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center" value={formData.taglio} onChange={e => setFormData({...formData, taglio: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center" value={formData.piega} onChange={e => setFormData({...formData, piega: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-center" value={formData.verniciatura} onChange={e => setFormData({...formData, verniciatura: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdate(process.id)} className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={process.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {process.articolo_nome}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${process.taglio < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>{process.taglio}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${process.piega < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>{process.piega}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${process.verniciatura < 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>{process.verniciatura}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(process)} className="text-slate-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {processes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nessun processo trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

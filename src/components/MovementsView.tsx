import React, { useState, useEffect } from 'react';
import { MovementLog } from '../types';
import { History, Search, Download } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

export default function MovementsView() {
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/movements');
      const data = await res.json();
      setMovements(data);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
    const interval = setInterval(fetchMovements, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFase = (fase: string) => {
    switch (fase) {
      case 'taglio': return 'Taglio';
      case 'piega': return 'Piega';
      case 'verniciatura': return 'Verniciatura';
      case 'impegni': return 'Impegni Clienti';
      case 'impegni_creazione': return 'Creazione Impegno';
      case 'impegni_evasione': return 'Evasione Impegno';
      case 'impegni_evasione_commessa': return 'Evasione Commessa';
      default: return fase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const filteredMovements = movements.filter(m => 
    m.articolo_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.articolo_codice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.fase.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.operatore?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadCSV = () => {
    if (movements.length === 0) {
      toast.error("Nessun dato da scaricare");
      return;
    }

    // Header del CSV
    const headers = ["Data e Ora", "Codice Articolo", "Nome Articolo", "Fase", "Tipo Movimento", "Quantità", "Operatore"];
    
    // Righe del CSV
    const rows = movements.map(m => [
      formatDate(m.timestamp),
      m.articolo_codice || '',
      m.articolo_nome || '',
      formatFase(m.fase),
      m.tipo.toUpperCase(),
      m.quantita.toString(),
      m.operatore || 'System'
    ]);

    // Unione con separatore punto e virgola (standard per Excel in Italia)
    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n");

    // Creazione del Blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `registro_movimenti_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV scaricato con successo");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-2 rounded-lg">
            <History className="h-5 w-5 text-slate-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Registro Movimenti</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            />
          </div>
          
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shrink-0"
            title="Scarica Registro in CSV per il revisore"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Scarica CSV</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr className="text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">Data e Ora</th>
              <th className="w-[180px] py-2 px-2 text-left border-r border-slate-200">Articolo</th>
              <th className="w-[120px] py-2 px-2 text-left border-r border-slate-200">Fase</th>
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">Tipo</th>
              <th className="w-[100px] py-2 px-2 text-right border-r border-slate-200">Quantità</th>
              <th className="w-[140px] py-2 px-2 text-left">Operatore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 italic">Caricamento in corso...</td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 italic">Nessun movimento trovato</td>
              </tr>
            ) : (
              filteredMovements.map((m) => (
                <tr key={m.id} className="h-8 hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50/50">
                  <td className="py-1 px-2 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                    {formatDate(m.timestamp)}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 font-medium text-slate-900">
                    <div className="flex flex-col">
                      <span className="truncate">{m.articolo_nome}</span>
                      <span className="text-[10px] text-slate-400 leading-none">{m.articolo_codice}</span>
                    </div>
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                    {formatFase(m.fase)}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100">
                    <span className={clsx(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      m.tipo === 'carico' ? "bg-emerald-100 text-emerald-700" : 
                      m.tipo === 'scarico' ? "bg-red-100 text-red-700" : 
                      "bg-blue-100 text-blue-700"
                    )}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                    {m.quantita.toLocaleString()}
                  </td>
                  <td className="py-1 px-2 text-slate-500 italic truncate">
                    {m.operatore || 'System'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
        <span>Totale movimenti: {filteredMovements.length}</span>
        <span>Stile ERP Compatto</span>
      </div>
    </div>
  );
}

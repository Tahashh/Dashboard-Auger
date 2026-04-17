import React, { useState, useEffect } from 'react';
import { MovementLog } from '../types';
import { History, Search, Download } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { fetchMovements } from '../api';

export default function MovementsView() {
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({
    timestamp: '',
    articolo: '',
    fase: '',
    tipo: '',
    quantita: '',
    cliente: '',
    commessa: '',
    operatore: '',
    tempo: ''
  });

  const loadMovements = async () => {
    try {
      const data = await fetchMovements();
      setMovements(data);
    } catch (error) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
    const interval = setInterval(loadMovements, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Normalize SQLite's 'YYYY-MM-DD HH:MM:SS' to ISO 'YYYY-MM-DDTHH:MM:SSZ'
    const normalized = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
    const date = new Date(normalized);
    
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Rome'
    });
  };

  const formatFase = (m: MovementLog) => {
    if (m.commessa) {
      const f = m.fase?.toLowerCase() || '';
      if (f === 'taglio') return 'tag.';
      if (f === 'piega') return 'gre.';
      if (f === 'saldatura') return 'sald.';
      if (f === 'verniciatura') return 'ver.';
      if (f === 'impegni_creazione') {
        const isPiastra = (m.articolo_nome || '').toUpperCase().includes('PIASTRA');
        return isPiastra ? 'gre.' : 'ver.';
      }
      
      // Fallback for any other phase
      return f.substring(0, 4) + '.';
    }

    const f = m.fase?.toLowerCase() || '';
    switch (f) {
      case 'taglio': return 'Taglio';
      case 'piega': return 'Piega';
      case 'saldatura': return 'Saldatura';
      case 'verniciatura': return 'Verniciatura';
      case 'impegni': return 'Impegni Clienti';
      case 'impegni_creazione': return 'Creazione Impegno';
      case 'impegni_evasione': return 'Evasione Impegno';
      case 'impegni_evasione_commessa': return 'Evasione Commessa';
      case 'spedizione': return 'Spedizione Commessa';
      case 'scarico': return 'Scarico';
      default: return m.fase ? m.fase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    }
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.articolo_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.articolo_codice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fase?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.operatore?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTimestamp = filters.timestamp === '' || formatDate(m.timestamp).toLowerCase().includes(filters.timestamp.toLowerCase());
    const matchesArticolo = filters.articolo === '' || 
      m.articolo_nome?.toLowerCase().includes(filters.articolo.toLowerCase()) ||
      m.articolo_codice?.toLowerCase().includes(filters.articolo.toLowerCase());
    const matchesFase = filters.fase === '' || formatFase(m).toLowerCase().includes(filters.fase.toLowerCase());
    
    let matchesTipo = true;
    if (filters.tipo !== '') {
      if (filters.tipo === 'verde') {
        matchesTipo = m.tipo === 'carico';
      } else if (filters.tipo === 'giallo') {
        matchesTipo = m.tipo === 'scarico' || m.tipo === 'scarico da commessa' || m.tipo === 'SCARICO COMP. AGM' || m.tipo === 'SCARICO COMP. AGR';
      } else if (filters.tipo === 'azzurro') {
        matchesTipo = m.tipo === 'Evasione Commessa';
      } else {
        matchesTipo = m.tipo?.toLowerCase().includes(filters.tipo.toLowerCase());
      }
    }

    const matchesQuantita = filters.quantita === '' || m.quantita.toString().includes(filters.quantita);
    const matchesCliente = filters.cliente === '' || (m.cliente || '').toLowerCase().includes(filters.cliente.toLowerCase());
    const matchesCommessa = filters.commessa === '' || (m.commessa || '').toLowerCase().includes(filters.commessa.toLowerCase());
    const matchesOperatore = filters.operatore === '' || (m.operatore || '').toLowerCase().includes(filters.operatore.toLowerCase());
    const matchesTempo = filters.tempo === '' || (m.tempo?.toString() || '').includes(filters.tempo);

    return matchesSearch && matchesTimestamp && matchesArticolo && matchesFase && matchesTipo && matchesQuantita && matchesCliente && matchesCommessa && matchesOperatore && matchesTempo;
  });

  const handleDownloadCSV = () => {
    if (movements.length === 0) {
      toast.error("Nessun dato da scaricare");
      return;
    }

    // Header del CSV
    const headers = ["Data e Ora", "Codice Articolo", "Nome Articolo", "Fase", "Tipo Movimento", "Quantità", "Cliente", "Commessa", "Tempo (min)", "Note", "Operatore"];
    
    // Righe del CSV
    const rows = movements.map(m => [
      formatDate(m.timestamp),
      m.articolo_codice || '',
      m.articolo_nome || '',
      formatFase(m),
      (m.tipo || '').toUpperCase(),
      m.quantita.toString(),
      m.cliente || '',
      m.commessa || '',
      m.tempo?.toString() || '',
      m.note || '',
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
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
            <History className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registro Movimenti</h2>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>

          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm hover:shadow-md shrink-0"
            title="Scarica Registro in CSV per il revisore"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Scarica CSV</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-xs min-w-[1200px]">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr className="text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Data e Ora</span>
                  <input
                    type="text"
                    value={filters.timestamp}
                    onChange={(e) => setFilters({ ...filters, timestamp: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[180px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Articolo</span>
                  <input
                    type="text"
                    value={filters.articolo}
                    onChange={(e) => setFilters({ ...filters, articolo: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[120px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Fase</span>
                  <input
                    type="text"
                    value={filters.fase}
                    onChange={(e) => setFilters({ ...filters, fase: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Tipo</span>
                  <select
                    value={filters.tipo}
                    onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="">Tutti</option>
                    <option value="verde" className="text-emerald-600">Verde (Carico)</option>
                    <option value="giallo" className="text-yellow-600">Giallo (Scarico)</option>
                    <option value="azzurro" className="text-sky-600">Azzurro (Evasione)</option>
                  </select>
                </div>
              </th>
              <th className="w-[100px] py-2 px-2 text-right border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Quantità</span>
                  <input
                    type="text"
                    value={filters.quantita}
                    onChange={(e) => setFilters({ ...filters, quantita: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500 text-right"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[160px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Cliente</span>
                  <input
                    type="text"
                    value={filters.cliente}
                    onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[160px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Commessa</span>
                  <input
                    type="text"
                    value={filters.commessa}
                    onChange={(e) => setFilters({ ...filters, commessa: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[100px] py-2 px-2 text-right border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Tempo (min)</span>
                  <input
                    type="text"
                    value={filters.tempo}
                    onChange={(e) => setFilters({ ...filters, tempo: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500 text-right"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[140px] py-2 px-2 text-left">
                <div className="flex flex-col gap-1">
                  <span>Operatore</span>
                  <input
                    type="text"
                    value={filters.operatore}
                    onChange={(e) => setFilters({ ...filters, operatore: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && movements.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 italic">Caricamento in corso...</td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 italic">Nessun movimento trovato</td>
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
                    {m.commessa ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {formatFase(m)}
                      </span>
                    ) : (
                      formatFase(m)
                    )}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100">
                    <span className={clsx(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                      m.tipo === 'carico' ? "bg-emerald-100 text-emerald-700" : 
                      m.tipo === 'scarico' || m.tipo === 'scarico da commessa' || m.tipo === 'SCARICO COMP. AGM' || m.tipo === 'SCARICO COMP. AGR' ? "bg-yellow-100 text-yellow-800" : 
                      m.tipo === 'Evasione Commessa' ? "bg-sky-100 text-sky-700" :
                      m.tipo === 'evasione' ? "bg-indigo-100 text-indigo-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-right font-mono font-semibold text-slate-700 relative group">
                    <span 
                      title={m.quantita_lanciata && m.quantita_lanciata !== m.quantita ? `QT.à lanciata ${m.quantita_lanciata}` : undefined}
                      className={clsx(
                        m.quantita_lanciata && m.quantita_lanciata !== m.quantita && "underline decoration-dotted decoration-indigo-400 cursor-help"
                      )}
                    >
                      {m.quantita.toLocaleString()}
                    </span>
                    {m.quantita_lanciata && m.quantita_lanciata !== m.quantita && (
                      <div className="absolute hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl z-50 -top-8 right-0 whitespace-nowrap border border-slate-700">
                        QT.à lanciata: {m.quantita_lanciata}
                        <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 rotate-45 border-r border-b border-slate-700"></div>
                      </div>
                    )}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-slate-600 relative group">
                    <span className="font-medium text-slate-800 truncate" title={m.cliente}>{m.cliente || '-'}</span>
                    {m.note && (
                      <div className="absolute hidden group-hover:block bg-red-600 text-white text-xs p-2 rounded shadow-lg z-50 -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        {m.note}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45"></div>
                      </div>
                    )}
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                    <span className="text-slate-500 truncate" title={m.commessa}>{m.commessa || '-'}</span>
                  </td>
                  <td className="py-1 px-2 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                    {m.tempo || '-'}
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

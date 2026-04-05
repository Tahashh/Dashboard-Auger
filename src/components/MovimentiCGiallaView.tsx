import React, { useState, useEffect } from 'react';
import { MovimentoCGialla } from '../types';
import { History, Search, Download } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { fetchMovimentiCGialla } from '../api';

export default function MovimentiCGiallaView() {
  const [movements, setMovements] = useState<MovimentoCGialla[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    data_reg: '',
    articolo_spc: '',
    fase: '',
    quantita: '',
    cliente: '',
    commessa: '',
    operatore: '',
    tempo: ''
  });

  const loadMovements = async () => {
    try {
      const data = await fetchMovimentiCGialla();
      setMovements(data);
    } catch (error) {
      console.error("Error fetching movimenti C. Gialla:", error);
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
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Rome'
    });
  };

  const filteredMovements = movements.filter(m => {
    const matchesSearch = searchTerm === '' || 
      m.articolo_spc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.fase?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.operatore?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cliente_commessa?.toLowerCase().includes(searchTerm.toLowerCase());

    const [cliente, commessa] = (m.cliente_commessa || '').split(' - ');

    const matchesData = filters.data_reg === '' || formatDate(m.data_reg).toLowerCase().includes(filters.data_reg.toLowerCase());
    const matchesArticolo = filters.articolo_spc === '' || m.articolo_spc?.toLowerCase().includes(filters.articolo_spc.toLowerCase());
    const matchesFase = filters.fase === '' || m.fase?.toLowerCase().includes(filters.fase.toLowerCase());
    const matchesQuantita = filters.quantita === '' || m.quantita.toString().includes(filters.quantita);
    const matchesCliente = filters.cliente === '' || (cliente || '').toLowerCase().includes(filters.cliente.toLowerCase());
    const matchesCommessa = filters.commessa === '' || (commessa || '').toLowerCase().includes(filters.commessa.toLowerCase());
    const matchesOperatore = filters.operatore === '' || (m.operatore || '').toLowerCase().includes(filters.operatore.toLowerCase());
    const matchesTempo = filters.tempo === '' || (m.tempo_totale?.toString() || '').includes(filters.tempo);

    return matchesSearch && matchesData && matchesArticolo && matchesFase && matchesQuantita && matchesCliente && matchesCommessa && matchesOperatore && matchesTempo;
  });

  const handleDownloadCSV = () => {
    if (movements.length === 0) {
      toast.error("Nessun dato da scaricare");
      return;
    }

    const headers = ["Data Reg.", "Articolo SPC.", "Fase", "Quantità", "Cliente", "Commessa", "Operatore", "Tempo Prod. + Prep. (min)"];
    
    const rows = movements.map(m => {
      const [cliente, commessa] = (m.cliente_commessa || '').split(' - ');
      return [
        formatDate(m.data_reg),
        m.articolo_spc || '',
        m.fase || '',
        m.quantita.toString(),
        cliente || '',
        commessa || '',
        m.operatore || 'System',
        m.tempo_totale ? m.tempo_totale.toString() : '0'
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `movimenti_c_gialla_${timestamp}.csv`);
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
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-2.5 rounded-xl shadow-sm">
            <History className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Movimenti C. Gialla</h2>
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
            title="Scarica Registro in CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Scarica CSV</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-xs min-w-[1000px]">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
            <tr className="text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Data Reg.</span>
                  <input
                    type="text"
                    value={filters.data_reg}
                    onChange={(e) => setFilters({ ...filters, data_reg: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] font-normal border border-slate-200 rounded outline-none focus:border-indigo-500"
                    placeholder="Filtra..."
                  />
                </div>
              </th>
              <th className="w-[180px] py-2 px-2 text-left border-r border-slate-200">
                <div className="flex flex-col gap-1">
                  <span>Articolo SPC.</span>
                  <input
                    type="text"
                    value={filters.articolo_spc}
                    onChange={(e) => setFilters({ ...filters, articolo_spc: e.target.value })}
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
              <th className="w-[140px] py-2 px-2 text-left border-r border-slate-200">
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
              <th className="w-[140px] py-2 px-2 text-right">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && movements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">Caricamento in corso...</td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">Nessun movimento trovato</td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const [cliente, commessa] = (m.cliente_commessa || '').split(' - ');
                return (
                  <tr key={m.id} className="h-8 hover:bg-gray-100 transition-colors odd:bg-white even:bg-gray-50/50">
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 whitespace-nowrap">
                      {formatDate(m.data_reg)}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-medium text-slate-900">
                      {m.articolo_spc}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-600 uppercase font-bold">
                      {m.fase}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-right font-mono font-semibold text-slate-700 relative group">
                      <span 
                        title={m.quantita_lanciata && m.quantita_lanciata !== m.quantita ? `QT.à lanciata ${m.quantita_lanciata}` : undefined}
                        className={clsx(
                          m.quantita_lanciata && m.quantita_lanciata !== m.quantita && "underline decoration-dotted decoration-yellow-500 cursor-help"
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
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                      {cliente || '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-600">
                      {commessa || '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 italic">
                      {m.operatore || 'System'}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-semibold text-slate-700">
                      {m.tempo_totale || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
        <span>Totale movimenti C. Gialla: {filteredMovements.length}</span>
        <span>Stile ERP Compatto</span>
      </div>
    </div>
  );
}

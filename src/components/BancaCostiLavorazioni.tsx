import React, { useState, useEffect, useMemo } from 'react';
import { Article } from '../types';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Filter, Search } from 'lucide-react';

const BancaCostiLavorazioni: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tutti');
  const [searchCodice, setSearchCodice] = useState('');
  const [searchNome, setSearchNome] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      const data = await response.json();
      setArticles(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Errore nel caricamento articoli');
      setLoading(false);
    }
  };

  const updateArticleCost = async (id: number, field: string, value: number) => {
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Errore aggiornamento');
      fetchArticles();
      toast.success('Dato aggiornato');
    } catch (error) {
      toast.error('Errore aggiornamento costo');
    }
  };

  const getCostoTotaleArticolo = (art: Article) => {
    return (art.prezzo_lamiera || 0) + 
           (art.prezzo_taglio || 0) + 
           (art.prezzo_piega || 0) + 
           (art.prezzo_verniciatura || 0) + 
           (art.prezzo_gommatura || 0) + 
           (art.prezzo_montaggio || 0);
  };

  const getPrezzoVenditaCalcolato = (art: Article) => {
    const costo = getCostoTotaleArticolo(art);
    return costo > 0 ? (costo * 1.42) + 14.70 : 0;
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(art => {
      // Filter by Codice
      if (searchCodice && !art.codice.toLowerCase().includes(searchCodice.toLowerCase())) {
        return false;
      }
      // Filter by Nome
      if (searchNome && !art.nome.toLowerCase().includes(searchNome.toLowerCase())) {
        return false;
      }

      // Filter by Fase
      if (filter === 'Tutti') return true;
      if (filter === 'Lamiera') return (art.prezzo_lamiera || 0) > 0;
      if (filter === 'Taglio') return (art.prezzo_taglio || 0) > 0;
      if (filter === 'Piega') return (art.prezzo_piega || 0) > 0;
      if (filter === 'Verniciatura') return (art.prezzo_verniciatura || 0) > 0;
      if (filter === 'Gommatura') return (art.prezzo_gommatura || 0) > 0;
      if (filter === 'Montaggio') return (art.prezzo_montaggio || 0) > 0;
      return true;
    });
  }, [articles, filter, searchCodice, searchNome]);

  const totals = useMemo(() => {
    return filteredArticles.reduce((acc, art) => {
      const costo_unitario = getCostoTotaleArticolo(art);
      const vendita_unitaria = getPrezzoVenditaCalcolato(art);

      acc.lamiera += (art.prezzo_lamiera || 0);
      acc.taglio += (art.prezzo_taglio || 0);
      acc.piega += (art.prezzo_piega || 0);
      acc.verniciatura += (art.prezzo_verniciatura || 0);
      acc.gommatura += (art.prezzo_gommatura || 0);
      acc.montaggio += (art.prezzo_montaggio || 0);
      acc.vendita += vendita_unitaria;
      acc.costo_totale += costo_unitario;
      return acc;
    }, { lamiera: 0, taglio: 0, piega: 0, verniciatura: 0, gommatura: 0, montaggio: 0, vendita: 0, costo_totale: 0 });
  }, [filteredArticles]);

  const chartData = useMemo(() => {
    const data = [
      { name: 'Lamiera', value: totals.lamiera },
      { name: 'Taglio', value: totals.taglio },
      { name: 'Piega', value: totals.piega },
      { name: 'Verniciatura', value: totals.verniciatura },
      { name: 'Gommatura', value: totals.gommatura },
      { name: 'Montaggio', value: totals.montaggio },
    ];
    if (filter === 'Tutti') return data;
    return data.filter(d => d.name === filter);
  }, [totals, filter]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) return <div className="p-6 text-slate-300">Caricamento...</div>;

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Banca Costi Lavorazioni</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Totale Costi</h3>
          <p className="text-3xl font-bold text-white">€ {totals.costo_totale.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Totale Vendita</h3>
          <p className="text-3xl font-bold text-white">€ {totals.vendita.toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Utile Stimato</h3>
          <p className={`text-3xl font-bold ${totals.vendita - totals.costo_totale >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            € {(totals.vendita - totals.costo_totale).toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h3 className="text-sm font-semibold uppercase text-slate-400">Margine</h3>
          <p className="text-3xl font-bold text-white">
            {totals.vendita > 0 ? (((totals.vendita - totals.costo_totale) / totals.vendita) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-start gap-4 mb-6">
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <Search className="h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca Codice..." 
            value={searchCodice}
            onChange={(e) => setSearchCodice(e.target.value)}
            className="bg-transparent text-white border-none focus:ring-0 outline-none w-40"
          />
        </div>
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <Search className="h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca Nome..." 
            value={searchNome}
            onChange={(e) => setSearchNome(e.target.value)}
            className="bg-transparent text-white border-none focus:ring-0 outline-none w-48"
          />
        </div>
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <Filter className="h-5 w-5 text-slate-400" />
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-transparent text-white border-none focus:ring-0 outline-none cursor-pointer"
          >
            <option className="bg-slate-800 text-white" value="Tutti">Tutte le fasi</option>
            <option className="bg-slate-800 text-white" value="Lamiera">Costo Lamiera</option>
            <option className="bg-slate-800 text-white" value="Taglio">Costo Taglio</option>
            <option className="bg-slate-800 text-white" value="Piega">Costo Piega</option>
            <option className="bg-slate-800 text-white" value="Verniciatura">Costo Verniciatura</option>
            <option className="bg-slate-800 text-white" value="Gommatura">Costo Gommatura</option>
            <option className="bg-slate-800 text-white" value="Montaggio">Costo Montaggio</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-white">Distribuzione Costi per Fase</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <h2 className="text-xl font-bold mb-4 text-white">Composizione Costi</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-700 text-slate-100 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Codice</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Costo Totale</th>
              <th className="px-6 py-4">Prezzo Vendita (Auto)</th>
              <th className="px-6 py-4">Costi Lavorazioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredArticles.map(art => {
              const costoTotale = getCostoTotaleArticolo(art);
              const prezzoVendita = getPrezzoVenditaCalcolato(art);
              return (
                <tr key={art.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 font-medium text-white">{art.codice}</td>
                  <td className="px-6 py-4">{art.nome}</td>
                  <td className="px-6 py-4 font-semibold text-slate-300">
                    € {costoTotale.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">
                    € {prezzoVendita.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 flex gap-2 flex-nowrap overflow-x-auto">
                    {(filter === 'Tutti' || filter === 'Lamiera') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Lamiera</span>
                        <input type="number" value={art.prezzo_lamiera || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_lamiera', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                    {(filter === 'Tutti' || filter === 'Taglio') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Taglio</span>
                        <input type="number" value={art.prezzo_taglio || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_taglio', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                    {(filter === 'Tutti' || filter === 'Piega') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Piega</span>
                        <input type="number" value={art.prezzo_piega || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_piega', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                    {(filter === 'Tutti' || filter === 'Verniciatura') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Vernic.</span>
                        <input type="number" value={art.prezzo_verniciatura || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_verniciatura', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                    {(filter === 'Tutti' || filter === 'Gommatura') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Gommat.</span>
                        <input type="number" value={art.prezzo_gommatura || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_gommatura', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                    {(filter === 'Tutti' || filter === 'Montaggio') && (
                      <div className="flex flex-col gap-1 min-w-[60px]">
                        <span className="text-[10px] text-slate-500 truncate">Montag.</span>
                        <input type="number" value={art.prezzo_montaggio || 0} onChange={(e) => updateArticleCost(art.id as any, 'prezzo_montaggio', parseFloat(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-xs text-white" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BancaCostiLavorazioni;

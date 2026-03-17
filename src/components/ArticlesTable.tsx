import { useState } from 'react';
import { Article, Process, Commitment } from '../types';
import { Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import clsx from 'clsx';
import { getDisponibilita } from '../utils';

interface ArticlesTableProps {
  articles: Article[];
  commitments: Commitment[];
  processes: Process[];
  onUpdate: () => void;
}

export default function ArticlesTable({ articles, commitments, processes, onUpdate }: ArticlesTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    nome: '',
    codice: '',
    verniciati: 0,
    impegni_clienti: 0,
    scorta: 10
  });

  const filteredArticles = articles.filter(a => 
    a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.codice.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    try {
      await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setIsAdding(false);
      setFormData({ nome: '', codice: '', verniciati: 0, impegni_clienti: 0, scorta: 10 });
      onUpdate();
    } catch (error) {
      console.error("Error adding article:", error);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating article:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return;
    try {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      onUpdate();
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  };

  const startEdit = (article: Article) => {
    setEditingId(article.id);
    setFormData({
      nome: article.nome,
      codice: article.codice,
      verniciati: article.verniciati,
      impegni_clienti: article.impegni_clienti,
      scorta: article.scorta
    });
  };

  const exportCSV = () => {
    const headers = ['Articolo', 'Codice', 'Verniciati', 'Impegni Clienti', 'Disponibilita'];
    const csvContent = [
      headers.join(','),
      ...filteredArticles.map(a => [
        `"${a.nome}"`,
        `"${a.codice}"`,
        a.verniciati,
        a.impegni_clienti,
        getDisponibilita(a)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'articoli_auger.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Gestione Articoli
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
            {articles.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportCSV}
            className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
            title="Esporta CSV"
          >
            CSV
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 text-white p-1.5 rounded-md hover:bg-slate-800 transition-colors"
            title="Aggiungi Articolo"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca articolo o codice..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">Articolo</th>
              <th className="px-4 py-3 font-semibold">Codice</th>
              <th className="px-4 py-3 font-semibold text-right">Verniciati</th>
              <th className="px-4 py-3 font-semibold text-right">Impegni</th>
              <th className="px-4 py-3 font-semibold text-right">Scorta</th>
              <th className="px-4 py-3 font-semibold text-right">Disp.</th>
              <th className="px-4 py-3 font-semibold text-center w-16">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-emerald-50/50">
                <td className="px-4 py-2">
                  <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </td>
                <td className="px-4 py-2">
                  <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Codice" value={formData.codice} onChange={e => setFormData({...formData, codice: e.target.value})} />
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.verniciati} onChange={e => setFormData({...formData, verniciati: parseInt(e.target.value) || 0})} />
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.impegni_clienti} onChange={e => setFormData({...formData, impegni_clienti: parseInt(e.target.value) || 0})} />
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" placeholder="Scorta" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">
                  {getDisponibilita({ id: 0, nome: formData.nome, codice: formData.codice, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, piega: 0, scorta: formData.scorta })}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={handleAdd} className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )}

            {filteredArticles.map((article) => {
              const disponibilita = getDisponibilita(article);
              const isNegative = disponibilita < 0;
              const isPositive = disponibilita > 0;
              const isEditing = editingId === article.id;

              if (isEditing) {
                return (
                  <tr key={article.id} className="bg-blue-50/50">
                    <td className="px-4 py-2">
                      <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={formData.codice} onChange={e => setFormData({...formData, codice: e.target.value})} />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        className={`w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right ${article.nome.toLowerCase().includes('piastra') ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                        value={formData.verniciati} 
                        onChange={e => setFormData({...formData, verniciati: parseInt(e.target.value) || 0})} 
                        disabled={article.nome.toLowerCase().includes('piastra')}
                        title={article.nome.toLowerCase().includes('piastra') ? "Le piastre non vengono verniciate. Modifica la quantità in 'Piega' nei Processi Aziendali." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.impegni_clienti} onChange={e => setFormData({...formData, impegni_clienti: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-400">
                      {getDisponibilita({...article, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, scorta: formData.scorta})}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdate(article.id)} className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={article.id} className="hover:bg-slate-50 transition-colors group">
                  <td className={clsx("px-4 py-3 font-medium", isNegative ? "text-amber-500" : "text-slate-900")}>
                    {article.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {article.codice}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {article.nome.toLowerCase().includes('piastra') ? (
                      <span className="text-slate-400" title="Le piastre non vengono verniciate. Disponibilità basata su 'Piega'.">-</span>
                    ) : (
                      article.verniciati
                    )}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono",
                    article.impegni_clienti < 0 ? "bg-red-50 text-red-700" : "text-slate-700"
                  )}>
                    {article.impegni_clienti}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {article.scorta}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono font-bold",
                    isNegative && "text-red-500",
                    isPositive && "text-emerald-500",
                    disponibilita === 0 && "text-slate-400"
                  )}>
                    {disponibilita > 0 ? `+${disponibilita}` : disponibilita}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(article)} className="text-slate-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(article.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredArticles.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nessun articolo trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

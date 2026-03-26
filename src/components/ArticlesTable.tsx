import { useState } from 'react';
import { Article, Process, Commitment } from '../types';
import { Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import clsx from 'clsx';
import { getDisponibilita } from '../utils';
import ConfirmModal from './ConfirmModal';

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
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  const [formData, setFormData] = useState({
    nome: '',
    codice: '',
    taglio: 0,
    piega: 0,
    saldatura: 0,
    verniciati: 0,
    impegni_clienti: 0,
    scorta: 10
  });

  const filteredArticles = articles
    .filter(a => 
      a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.codice.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.codice.localeCompare(b.codice));

  const handleAdd = async () => {
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Errore ${res.status}: ${errorText.substring(0, 100)}`);
      }
      setIsAdding(false);
      setFormData({ nome: '', codice: '', verniciati: 0, impegni_clienti: 0, scorta: 10, piega: 0, taglio: 0, saldatura: 0 });
      onUpdate();
    } catch (error) {
      console.error("Error adding article:", error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          codice: formData.codice,
          verniciati: formData.verniciati,
          impegni_clienti: formData.impegni_clienti,
          scorta: formData.scorta,
          piega: formData.piega // Some logic relies on piega in articles
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Errore ${res.status}: ${errorText.substring(0, 100)}`);
      }

      const process = processes.find(p => p.articolo_id === id);
      if (process) {
        await fetch(`/api/processes/${process.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taglio: formData.taglio,
            piega: formData.piega,
            saldatura: formData.saldatura,
            verniciatura: formData.verniciati // Keep verniciatura in sync with verniciati
          })
        });
      }

      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating article:", error);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Conferma Eliminazione',
      message: 'Sei sicuro di voler eliminare questo articolo?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Errore ${res.status}: ${errorText.substring(0, 100)}`);
          }
          onUpdate();
        } catch (error) {
          console.error("Error deleting article:", error);
        }
      }
    });
  };

  const startEdit = (article: Article) => {
    const process = processes.find(p => p.articolo_id === article.id);
    setEditingId(article.id);
    setFormData({
      nome: article.nome,
      codice: article.codice,
      taglio: process?.taglio || 0,
      piega: process?.piega || 0,
      saldatura: process?.saldatura || 0,
      verniciati: article.verniciati,
      impegni_clienti: article.impegni_clienti,
      scorta: article.scorta
    });
  };

  const exportCSV = () => {
    const headers = ['Articolo', 'Codice', 'Taglio', 'Piega', 'Saldatura', 'Verniciati', 'Impegni Clienti', 'Disponibilita'];
    const csvContent = [
      headers.join(','),
      ...filteredArticles.map(a => {
        const process = processes.find(p => p.articolo_id === a.id);
        return [
          `"${a.nome}"`,
          `"${a.codice}"`,
          process?.taglio || 0,
          process?.piega || 0,
          process?.saldatura || 0,
          a.verniciati,
          a.impegni_clienti,
          getDisponibilita(a, commitments)
        ].join(',');
      })
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

  const exportCSVProduzione = () => {
    const headers = ['Articolo', 'Codice'];
    const csvContent = [
      headers.join(','),
      ...filteredArticles.map(a => [
        `"${a.nome}"`,
        `"${a.codice}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'articoli_produzione_auger.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex items-center justify-between rounded-t-xl">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Gestione Articoli
          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm">
            {articles.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportCSVProduzione}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm"
            title="Esporta CSV Produzione (Solo Articolo e Codice)"
          >
            CSV Prod.
          </button>
          <button 
            onClick={exportCSV}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm"
            title="Esporta CSV Completo"
          >
            CSV
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
            title="Aggiungi Articolo"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cerca articolo o codice..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full min-w-[600px] text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold w-48 hidden">Articolo</th>
              <th className="px-4 py-3 font-semibold">Codice</th>
              <th className="px-4 py-3 font-semibold text-right" title="Verniciati (o Piega per le piastre)">Vern. / Piega</th>
              <th className="px-4 py-3 font-semibold text-right">Impegni</th>
              <th className="px-4 py-3 font-semibold text-right">Scorta</th>
              <th className="px-4 py-3 font-semibold text-right">Disp.</th>
              <th className="px-4 py-3 font-semibold text-center w-16">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-emerald-50/50">
                <td className="px-4 py-2 hidden">
                  <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                </td>
                <td className="px-4 py-2">
                  <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" placeholder="Codice" value={formData.codice} onChange={e => setFormData({...formData, codice: e.target.value})} />
                </td>
                <td className="px-4 py-2">
                  {formData.nome.toLowerCase().includes('piastra') ? (
                    <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.piega} onChange={e => setFormData({...formData, piega: parseInt(e.target.value) || 0})} title="Quantità in Piega (le piastre non vengono verniciate)" />
                  ) : (
                    <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.verniciati} onChange={e => setFormData({...formData, verniciati: parseInt(e.target.value) || 0})} />
                  )}
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.impegni_clienti} onChange={e => setFormData({...formData, impegni_clienti: parseInt(e.target.value) || 0})} />
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" placeholder="Scorta" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-400">
                  {getDisponibilita({ id: '0', nome: formData.nome, codice: formData.codice, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, piega: formData.piega, scorta: formData.scorta }, commitments)}
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
              const disponibilita = getDisponibilita(article, commitments);
              const isNegative = disponibilita < 10;
              const isPositive = disponibilita >= 10;
              const isEditing = editingId === article.id;

              if (isEditing) {
                return (
                  <tr key={article.id} className="bg-blue-50/50">
                    <td className="px-4 py-2 hidden">
                      <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" className="w-full border border-slate-300 rounded px-2 py-1 text-sm" value={formData.codice} onChange={e => setFormData({...formData, codice: e.target.value})} />
                    </td>
                    <td className="px-4 py-2">
                      {article.nome.toLowerCase().includes('piastra') ? (
                        <input 
                          type="number" 
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                          value={formData.piega} 
                          onChange={e => setFormData({...formData, piega: parseInt(e.target.value) || 0})} 
                          title="Quantità in Piega (le piastre non vengono verniciate)"
                        />
                      ) : (
                        <input 
                          type="number" 
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right"
                          value={formData.verniciati} 
                          onChange={e => setFormData({...formData, verniciati: parseInt(e.target.value) || 0})} 
                        />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.impegni_clienti} onChange={e => setFormData({...formData, impegni_clienti: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-400">
                      {getDisponibilita({...article, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, piega: formData.piega, scorta: formData.scorta}, commitments)}
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
                  <td className={clsx("px-4 py-3 font-medium truncate max-w-[150px] hidden", isNegative ? "text-amber-500" : "text-slate-900")} title={article.nome}>
                    {article.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {article.codice}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {article.nome.toLowerCase().includes('piastra') ? (
                      <span title="Quantità in Piega (le piastre non vengono verniciate)">{article.piega}</span>
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
    </>
  );
}

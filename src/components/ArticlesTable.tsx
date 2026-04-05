import { useState } from 'react';
import { Article, Process, Commitment } from '../types';
import { Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import clsx from 'clsx';
import { getDisponibilita } from '../utils';
import ConfirmModal from './ConfirmModal';
import { addArticle, updateArticle, deleteArticle, updateProcess } from '../api';
import toast from 'react-hot-toast';

interface ArticlesTableProps {
  articles: Article[];
  commitments: Commitment[];
  processes: Process[];
  onUpdate: () => void;
}

export default function ArticlesTable({ articles, commitments, processes, onUpdate }: ArticlesTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
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
      (a.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (a.codice || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dispA = getDisponibilita(a, commitments);
      const dispB = getDisponibilita(b, commitments);
      
      // Sort by availability: negative first, then zero, then positive
      if (dispA < 0 && dispB >= 0) return -1;
      if (dispA >= 0 && dispB < 0) return 1;
      if (dispA === 0 && dispB > 0) return -1;
      if (dispA > 0 && dispB === 0) return 1;
      
      return dispA - dispB;
    });

  const handleAdd = async () => {
    try {
      await addArticle(formData);
      setIsAdding(false);
      setFormData({ nome: '', codice: '', verniciati: 0, impegni_clienti: 0, scorta: 10, piega: 0, taglio: 0, saldatura: 0 });
      toast.success('Articolo aggiunto con successo');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'aggiunta dell\'articolo');
      console.error("Error adding article:", error);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateArticle(id, {
        nome: formData.nome,
        codice: formData.codice,
        verniciati: formData.verniciati,
        impegni_clienti: formData.impegni_clienti,
        scorta: formData.scorta,
        piega: formData.piega
      });

      const process = processes.find(p => p.articolo_id === id);
      if (process) {
        await updateProcess(process.id, {
          taglio: formData.taglio,
          piega: formData.piega,
          saldatura: formData.saldatura,
          verniciatura: formData.verniciati
        });
      }

      setEditingId(null);
      toast.success('Articolo aggiornato con successo');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'aggiornamento dell\'articolo');
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
          await deleteArticle(id);
          toast.success('Articolo eliminato con successo');
          onUpdate();
        } catch (error: any) {
          toast.error(error.message || 'Errore durante l\'eliminazione dell\'articolo');
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
          a.nome.toLowerCase().includes('piastre') ? (a.piega || 0) : a.verniciati,
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
        variant={confirmModal.variant}
      />
      <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex items-center justify-between rounded-t-xl">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Gestione Articoli
          <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm">
            Totale: {articles.length}
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
              <th className="px-4 py-3 font-semibold w-48">Articolo</th>
              <th className="px-4 py-3 font-semibold">Codice</th>
              <th className="px-4 py-3 font-semibold text-right" title="Pezzi Verniciati (o Grezzi per Piastre)">Verniciati / Grezzo</th>
              <th className="px-4 py-3 font-semibold text-right">Impegni</th>
              <th className="px-4 py-3 font-semibold text-right">Tot.</th>
              <th className="px-4 py-3 font-semibold text-right">Scorta</th>
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
                  <input 
                    type="number" 
                    className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono" 
                    value={formData.nome.toLowerCase().includes('piastre') ? formData.piega : formData.verniciati} 
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      if (formData.nome.toLowerCase().includes('piastre')) {
                        setFormData({...formData, piega: val});
                      } else {
                        setFormData({...formData, verniciati: val});
                      }
                    }} 
                  />
                </td>
                <td className="px-4 py-2 text-right font-mono text-slate-700">
                  {commitments.filter(c => String(c.articolo_id) === '0' && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-bold text-slate-400">
                  {getDisponibilita({ id: '0', nome: formData.nome, codice: formData.codice, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, piega: formData.piega, scorta: formData.scorta }, commitments)}
                </td>
                <td className="px-4 py-2">
                  <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono" placeholder="Scorta" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
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
              const isNegative = disponibilita < 0;
              const isPositive = disponibilita >= 0;
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
                        className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono"
                        value={formData.nome.toLowerCase().includes('piastre') ? formData.piega : formData.verniciati} 
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          if (formData.nome.toLowerCase().includes('piastre')) {
                            setFormData({...formData, piega: val});
                          } else {
                            setFormData({...formData, verniciati: val});
                          }
                        }} 
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-700">
                      {commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-400">
                      {getDisponibilita({...article, verniciati: formData.verniciati, impegni_clienti: formData.impegni_clienti, piega: formData.piega, scorta: formData.scorta}, commitments)}
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono" value={formData.scorta} onChange={e => setFormData({...formData, scorta: parseInt(e.target.value) || 0})} />
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
                  <td className={clsx("px-4 py-3 font-medium truncate max-w-[150px]", isNegative ? "text-amber-500" : "text-slate-900")} title={article.nome}>
                    {article.nome}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {article.codice}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono",
                    (article.nome.toLowerCase().includes('piastre') ? article.piega : article.verniciati) < 0 ? "text-red-600 font-bold" : "text-slate-700"
                  )}>
                    {article.nome.toLowerCase().includes('piastre') ? (article.piega || 0) : article.verniciati}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono",
                    (() => {
                      const tableImp = commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0);
                      const totalImp = Math.max(tableImp, article.impegni_clienti || 0);
                      return totalImp < 0 ? "text-red-600 font-bold" : "text-slate-700";
                    })()
                  )}>
                    {(() => {
                      const tableImp = commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0);
                      return Math.max(tableImp, article.impegni_clienti || 0);
                    })()}
                  </td>
                  <td className={clsx(
                    "px-4 py-3 text-right font-mono font-bold",
                    isNegative && "text-red-500",
                    isPositive && "text-emerald-500",
                    disponibilita === 0 && "text-slate-400"
                  )}>
                    {disponibilita}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-400">
                    {article.scorta}
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

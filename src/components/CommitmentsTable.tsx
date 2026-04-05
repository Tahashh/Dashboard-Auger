import { useState } from 'react';
import { Article, Commitment, AUTHORIZED_USERS } from '../types';
import { Edit2, Check, X, Info } from 'lucide-react';
import { updateArticle } from '../api';
import { toast } from 'react-hot-toast';

interface CommitmentsTableProps {
  articles: Article[];
  commitments: Commitment[];
  onUpdate: () => void;
  username: string;
  role?: string;
}

export default function CommitmentsTable({ articles, commitments, onUpdate, username, role }: CommitmentsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [impegni, setImpegni] = useState<number>(0);

  const isAuthorized = AUTHORIZED_USERS.includes(username) || role === 'developer';

  const handleUpdate = async (article: Article) => {
    if (!isAuthorized) return;
    try {
      await updateArticle(article.id, {
        impegni_clienti: impegni
      });
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Errore durante l'aggiornamento dell'impegno");
    }
  };

  const startEdit = (article: Article) => {
    if (!isAuthorized) return;
    setEditingId(article.id);
    setImpegni(article.impegni_clienti);
  };

  // Sort articles by commitments (descending) to show most engaged items first
  const sortedArticles = [...articles].sort((a, b) => {
    const impA = commitments.filter(c => c.articolo_id === a.id && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0);
    const impB = commitments.filter(c => c.articolo_id === b.id && c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0);
    return impB - impA;
  });

  const getArticleCommitments = (articleId: string) => {
    return commitments.filter(c => c.articolo_id === articleId && c.stato_lavorazione !== 'Completato');
  };

  const getPrioritaLabel = (p: number) => {
    if (p === 0) return "Nessuna";
    if (p <= 3) return "Bassa";
    if (p <= 6) return "Media";
    if (p <= 9) return "Alta";
    return "Urgente";
  };

  const getPrioritaColor = (p: number) => {
    if (p === 0) return "text-slate-400";
    if (p <= 3) return "text-blue-400";
    if (p <= 6) return "text-amber-400";
    if (p <= 9) return "text-orange-400";
    return "text-red-400 font-bold";
  };

  const mesi = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];
  const parseNote = (note?: string) => {
    if (!note) return { month: 'ALTRO', additionalNote: '' };
    const parts = note.split(' - ');
    if (parts.length > 1) {
      const firstPart = parts[0].toUpperCase();
      if (mesi.includes(firstPart)) {
        return { month: firstPart, additionalNote: parts.slice(1).join(' - ') };
      }
    } else {
      const noteUpper = note.toUpperCase();
      if (mesi.includes(noteUpper)) {
        return { month: noteUpper, additionalNote: '' };
      }
    }
    return { month: 'ALTRO', additionalNote: note };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex items-center justify-between rounded-t-xl">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Impegni Clienti
        </h2>
        <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          Totale: {commitments.filter(c => c.stato_lavorazione !== 'Completato').reduce((sum, c) => sum + c.quantita, 0)}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm text-left min-w-[400px]">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 font-semibold">Articolo</th>
              <th className="px-4 py-3 font-semibold text-right">Impegni</th>
              {isAuthorized && <th className="px-4 py-3 font-semibold text-center w-16">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedArticles.map((article) => {
              const isEditing = editingId === article.id;
              const articleCommitments = getArticleCommitments(article.id);
              const hasCommitments = articleCommitments.length > 0;

              if (isEditing) {
                return (
                  <tr key={article.id} className="bg-blue-50/50">
                    <td className="px-4 py-2 font-medium text-slate-900" title={article.nome}>
                      {article.nome}
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-right font-mono" 
                        value={impegni} 
                        onChange={e => setImpegni(parseInt(e.target.value) || 0)} 
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdate(article)} className="text-emerald-600 hover:text-emerald-700"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={article.id} className="hover:bg-slate-50 transition-colors group relative">
                  <td className="px-4 py-3 font-medium text-slate-900 group/tooltip cursor-help">
                    <div className="flex items-center gap-1">
                      <span>{article.nome}</span>
                      {hasCommitments && <Info className="h-3 w-3 text-slate-400" />}
                    </div>
                    
                    {/* Tooltip */}
                    {hasCommitments && (
                      <div className="absolute left-4 top-full mt-1 z-50 hidden group-hover/tooltip:block w-72 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700">
                        <div className="font-bold mb-2 border-b border-slate-600 pb-1">Dettaglio Impegni</div>
                        <ul className="space-y-2">
                                {articleCommitments.map(c => {
                                  const { additionalNote } = parseNote(c.note);
                                  return (
                                    <li key={`${c.id}-tooltip-1`} className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-emerald-400">{c.cliente}</div>
                                        <div className="text-slate-400 font-mono text-[10px]">
                                          {c.commessa}
                                          {additionalNote && <span className="text-emerald-300 ml-1 font-bold">N.B: {additionalNote}</span>}
                                        </div>
                                        <div className="text-[10px] mt-0.5 text-slate-300">
                                          Stato: <span className="font-semibold text-white">{c.stato_lavorazione || 'Pianificato'}</span>
                                          {c.priorita > 0 && (
                                            <span className={`ml-2 px-1 rounded bg-slate-700 ${getPrioritaColor(c.priorita)}`}>
                                              P: {getPrioritaLabel(c.priorita)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="bg-slate-700 px-1.5 py-0.5 rounded font-bold">{c.quantita} pz</span>
                                    </li>
                                  );
                                })}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 group/tooltip cursor-help">
                    {(() => {
                      const totalImp = articleCommitments.reduce((sum, c) => sum + c.quantita, 0);
                      return totalImp > 0 ? (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">
                          {totalImp}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      );
                    })()}
                    
                    {/* Tooltip for number as well */}
                    {hasCommitments && (
                      <div className="absolute right-16 top-full mt-1 z-50 hidden group-hover/tooltip:block w-72 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700 text-left">
                        <div className="font-bold mb-2 border-b border-slate-600 pb-1">Dettaglio Impegni</div>
                        <ul className="space-y-2">
                                {articleCommitments.map(c => {
                                  const { additionalNote } = parseNote(c.note);
                                  return (
                                    <li key={`${c.id}-tooltip-2`} className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-emerald-400">{c.cliente}</div>
                                        <div className="text-slate-400 font-mono text-[10px]">
                                          {c.commessa}
                                          {additionalNote && <span className="text-emerald-300 ml-1 font-bold">N.B: {additionalNote}</span>}
                                        </div>
                                        <div className="text-[10px] mt-0.5 text-slate-300">
                                          Stato: <span className="font-semibold text-white">{c.stato_lavorazione || 'Pianificato'}</span>
                                          {c.priorita > 0 && (
                                            <span className={`ml-2 px-1 rounded bg-slate-700 ${getPrioritaColor(c.priorita)}`}>
                                              P: {getPrioritaLabel(c.priorita)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="bg-slate-700 px-1.5 py-0.5 rounded font-bold">{c.quantita} pz</span>
                                    </li>
                                  );
                                })}
                        </ul>
                      </div>
                    )}
                  </td>
                  {isAuthorized && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(article)} className="text-slate-400 hover:text-blue-600"><Edit2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {articles.length === 0 && (
              <tr>
                <td colSpan={isAuthorized ? 3 : 2} className="px-4 py-8 text-center text-slate-400 text-sm">
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

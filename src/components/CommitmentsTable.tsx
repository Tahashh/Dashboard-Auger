import { useState, useEffect } from 'react';
import { Article, Commitment, AUTHORIZED_USERS } from '../types';
import { Edit2, Check, X, Info } from 'lucide-react';

interface CommitmentsTableProps {
  articles: Article[];
  onUpdate: () => void;
  username: string;
}

export default function CommitmentsTable({ articles, onUpdate, username }: CommitmentsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [impegni, setImpegni] = useState<number>(0);
  const [commitments, setCommitments] = useState<Commitment[]>([]);

  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const fetchCommitments = async () => {
    try {
      const res = await fetch('/api/commitments');
      const data = await res.json();
      setCommitments(data);
    } catch (error) {
      console.error("Error fetching commitments:", error);
    }
  };

  useEffect(() => {
    fetchCommitments();
    const interval = setInterval(fetchCommitments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async (article: Article) => {
    if (!isAuthorized) return;
    try {
      await fetch(`/api/articles/${article.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...article,
          impegni_clienti: impegni
        })
      });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error("Error updating commitment:", error);
    }
  };

  const startEdit = (article: Article) => {
    if (!isAuthorized) return;
    setEditingId(article.id);
    setImpegni(article.impegni_clienti);
  };

  // Sort articles by commitments (descending) to show most engaged items first
  const sortedArticles = [...articles].sort((a, b) => b.impegni_clienti - a.impegni_clienti);

  const getArticleCommitments = (articleId: number) => {
    return commitments.filter(c => c.articolo_id === articleId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          Impegni Clienti
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
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
                    <td className="px-4 py-2 font-medium text-slate-900 truncate max-w-[120px]" title={article.nome}>
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
                  <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[120px] group/tooltip cursor-help">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{article.nome}</span>
                      {hasCommitments && <Info className="h-3 w-3 text-slate-400" />}
                    </div>
                    
                    {/* Tooltip */}
                    {hasCommitments && (
                      <div className="absolute left-4 top-full mt-1 z-50 hidden group-hover/tooltip:block w-72 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700">
                        <div className="font-bold mb-2 border-b border-slate-600 pb-1">Dettaglio Impegni</div>
                        <ul className="space-y-2">
                          {articleCommitments.map(c => (
                            <li key={c.id} className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-emerald-400">{c.cliente}</div>
                                <div className="text-slate-400 font-mono text-[10px]">{c.commessa}</div>
                                <div className="text-[10px] mt-0.5 text-slate-300">Stato: <span className="font-semibold text-white">{c.stato_lavorazione || 'Pianificato'}</span></div>
                              </div>
                              <span className="bg-slate-700 px-1.5 py-0.5 rounded font-bold">{c.quantita} pz</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 group/tooltip cursor-help">
                    {article.impegni_clienti > 0 ? (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs">
                        {article.impegni_clienti}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                    
                    {/* Tooltip for number as well */}
                    {hasCommitments && (
                      <div className="absolute right-16 top-full mt-1 z-50 hidden group-hover/tooltip:block w-72 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 border border-slate-700 text-left">
                        <div className="font-bold mb-2 border-b border-slate-600 pb-1">Dettaglio Impegni</div>
                        <ul className="space-y-2">
                          {articleCommitments.map(c => (
                            <li key={c.id} className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-emerald-400">{c.cliente}</div>
                                <div className="text-slate-400 font-mono text-[10px]">{c.commessa}</div>
                                <div className="text-[10px] mt-0.5 text-slate-300">Stato: <span className="font-semibold text-white">{c.stato_lavorazione || 'Pianificato'}</span></div>
                              </div>
                              <span className="bg-slate-700 px-1.5 py-0.5 rounded font-bold">{c.quantita} pz</span>
                            </li>
                          ))}
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

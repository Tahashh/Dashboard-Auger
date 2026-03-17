import { useState, useEffect } from 'react';
import { Article, Process, Commitment } from '../types';
import { getDisponibilita } from '../utils';
import { Package, Search } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

interface Produzione2026ViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  onUpdate: () => void;
}

export default function Produzione2026View({ articles, processes, commitments, onUpdate }: Produzione2026ViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Tutte');

  // Helper to get process data for an article
  const getProcess = (articleId: number) => {
    return processes.find(p => p.articolo_id === articleId) || { taglio: 0, piega: 0, verniciatura: 0 };
  };

  // Helper to get commitments for an article
  const getArticleCommitments = (articleId: number) => {
    return commitments.filter(c => c.articolo_id === articleId);
  };

  const getCategory = (nome: string) => {
    const upper = nome.toUpperCase();
    if (upper.includes('PORTA')) return 'Porte';
    if (upper.includes('RETRO')) return 'Retri';
    if (upper.includes('LATERALE')) return 'Laterali';
    if (upper.includes('TETTO')) return 'Tetto';
    return 'Altro';
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.codice.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Tutte' || getCategory(a.nome) === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    // Sort by name within category
    return a.nome.localeCompare(b.nome);
  });

  const categories = ['Porte', 'Retri', 'Laterali', 'Tetto', 'Altro'];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Package className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Produzione 2026</h2>
            <p className="text-sm text-slate-500">Tabella generale di produzione con dettagli impegni</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cerca articolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="Tutte">Tutte le categorie</option>
            <option value="Porte">Porte</option>
            <option value="Retri">Retri</option>
            <option value="Laterali">Laterali</option>
            <option value="Tetto">Tetto</option>
            <option value="Altro">Altro</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto flex-1 p-4">
          <table className="w-full text-left border-collapse border border-slate-300 text-sm">
            <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-semibold border border-slate-600">PORTE</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-20">Tag.</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-20">Gre.</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-20">Ver.</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-20">IMP</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-20">scorta</th>
                <th className="px-3 py-2 font-semibold text-center border border-slate-600 w-24">tot</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {categories.map(category => {
                const categoryArticles = filteredArticles.filter(a => getCategory(a.nome) === category);
                
                if (categoryArticles.length === 0) return null;

                return (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-100">
                      <td colSpan={7} className="px-3 py-1.5 font-bold text-slate-700 uppercase text-[10px] border border-slate-300">
                        {category}
                      </td>
                    </tr>
                    {categoryArticles.map(article => {
                      const process = getProcess(article.id);
                      const articleCommitments = getArticleCommitments(article.id);
                      const disp = getDisponibilita(article);
                      const isPiastra = article.nome.toLowerCase().includes('piastra');
                      
                      let availabilityColorClass = "text-slate-900";
                      let articleNameClass = "text-slate-800";
                      
                      if (disp < 0) {
                        availabilityColorClass = "text-red-600 font-bold bg-red-50";
                        articleNameClass = "text-amber-500 font-bold";
                      } else if (disp > 0) {
                        availabilityColorClass = "text-emerald-600 font-bold bg-emerald-50";
                      }

                      const tooltipContent = articleCommitments.length > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-72 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700">
                          <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-emerald-400">Dettaglio Impegni Attivi:</div>
                          <ul className="text-left space-y-2 max-h-48 overflow-y-auto pr-1">
                            {articleCommitments.map(c => (
                              <li key={c.id} className="flex justify-between items-center border-b border-slate-800 pb-1.5 last:border-0">
                                <div className="flex flex-col truncate pr-2">
                                  <span className="font-bold text-slate-100">{c.cliente}</span>
                                  <span className="text-[9px] text-slate-400">Commessa: {c.commessa}</span>
                                </div>
                                <span className="font-bold text-amber-400 whitespace-nowrap">{c.quantita} pz</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between font-bold">
                            <span>Totale Impegni:</span>
                            <span className="text-amber-400">{article.impegni_clienti}</span>
                          </div>
                        </div>
                      );

                      return (
                        <tr key={article.id} className="hover:bg-slate-50 transition-colors h-8">
                          <td className={clsx("px-3 py-1 border border-slate-300", articleNameClass)}>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">{article.nome}</span>
                              <span className="text-[9px] text-slate-400 font-mono leading-none">{article.codice}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1 text-center font-mono text-xs text-slate-600 border border-slate-300 bg-emerald-50/20">
                            {process.taglio}
                          </td>
                          <td className="px-3 py-1 text-center font-mono text-xs text-slate-600 border border-slate-300 bg-slate-50/50">
                            {process.piega}
                          </td>
                          <td className="px-3 py-1 text-center font-mono text-xs text-slate-600 border border-slate-300">
                            {isPiastra ? <span className="text-slate-300">-</span> : article.verniciati}
                          </td>
                          <td className={clsx(
                            "px-3 py-1 text-center font-mono text-xs border border-slate-300 relative group cursor-help",
                            article.impegni_clienti > 0 ? "bg-orange-50 text-orange-700 font-bold" : "text-slate-400"
                          )}>
                            {article.impegni_clienti}
                            {tooltipContent}
                          </td>
                          <td className="px-3 py-1 text-center font-mono text-xs text-slate-400 border border-slate-300 bg-yellow-50/30">
                            {article.scorta}
                          </td>
                          <td className={clsx("px-3 py-1 text-center font-mono text-xs border border-slate-300", availabilityColorClass)}>
                            {disp}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {filteredArticles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 border border-slate-300">
                    Nessun articolo trovato con i filtri correnti
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

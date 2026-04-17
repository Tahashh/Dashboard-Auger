import React, { useMemo } from 'react';
import { Package } from 'lucide-react';
import { Article, Process, Commitment } from '../types';
import { getPhaseAvailability } from '../utils';
import clsx from 'clsx';

interface StruttureAGCViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  onUpdate: () => void;
}

const struttureAGCList = [
  { nome: "STRUTTURA AGC 600X1200X400", codice: "AGC061204" },
  { nome: "STRUTTURA AGC 600X1400X300", codice: "AGC061403" },
  { nome: "STRUTTURA AGC 800X1200X400", codice: "AGC081204" },
  { nome: "STRUTTURA AGC 800X1400X300", codice: "AGC081403" },
  { nome: "STRUTTURA AGC 800X1400X400", codice: "AGC081404" },
  { nome: "STRUTTURA AGC 1000X1200X400", codice: "AGC101204" },
  { nome: "STRUTTURA AGC 1000X1400X400", codice: "AGC101404" },
  { nome: "STRUTTURA AGC 1200X1200X400", codice: "AGC121204" },
  { nome: "STRUTTURA AGC 1200X1400X300", codice: "AGC121403" },
  { nome: "STRUTTURA AGC 1200X1400X400", codice: "AGC121404" },
  { nome: "STRUTTURA AGC 1400X1200X400", codice: "AGC141204" },
  { nome: "STRUTTURA AGC 1400X1400X400", codice: "AGC141404" }
];

export default function StruttureAGCView({ articles, processes, commitments, onUpdate }: StruttureAGCViewProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Gestione STRUTTURE AGC</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-semibold border-r border-slate-700">ARTICOLO</th>
              <th className="px-3 py-3 font-semibold border-r border-slate-700 text-center">TAG.</th>
              <th className="px-3 py-3 font-semibold border-r border-slate-700 text-center">PIEG.</th>
              <th className="px-3 py-3 font-semibold border-r border-slate-700 text-center">SALD.</th>
              <th className="px-3 py-3 font-semibold border-r border-slate-700 text-center">VER.</th>
              <th className="px-3 py-3 font-semibold border-r border-slate-700 text-center">IMP.</th>
              <th className="px-3 py-3 font-semibold text-center">TOT.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {struttureAGCList.map(({ nome, codice }) => {
              const article = articles.find(a => a.codice === codice);
              const process = article ? processes.find(p => p.articolo_id === article.id) : undefined;
              const verniciati = article?.verniciati || 0;
              const articleCommitments = article ? commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato' && c.fase_produzione === 'Verniciatura') : [];
              const tableImp = articleCommitments.reduce((sum, c) => sum + c.quantita, 0);
              const impegni = Math.max(tableImp, article?.impegni_clienti || 0);
              const tot = verniciati - impegni;
              
              const tooltipText = articleCommitments.length > 0 
                ? articleCommitments.map(c => `${c.cliente} - ${c.commessa}: ${c.quantita}pz`).join('\n')
                : undefined;
              
              const dispTaglio = article ? getPhaseAvailability(article, process, 'taglio', commitments) : 0;
              const dispPiega = article ? getPhaseAvailability(article, process, 'piega', commitments) : 0;
              const dispSaldatura = article ? getPhaseAvailability(article, process, 'saldatura', commitments) : 0;
              const dispVerniciatura = article ? getPhaseAvailability(article, process, 'verniciatura', commitments) : 0;
              
              return (
                <tr key={codice} className="h-12 hover:bg-slate-50 transition-colors">
                  <td className="border-r border-slate-200 px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700 text-[11px]">{nome}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{codice}</span>
                    </div>
                  </td>
                  <td className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono", dispTaglio < 0 && "bg-red-500 text-white")}>{process?.taglio || 0}</td>
                  <td className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono", dispPiega < 0 && "bg-red-500 text-white")}>{process?.piega || 0}</td>
                  <td className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono", dispSaldatura < 0 && "bg-red-500 text-white")}>{process?.saldatura || 0}</td>
                  <td className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono", dispVerniciatura < 0 && "bg-red-500 text-white")}>{verniciati}</td>
                  <td className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono font-bold", impegni > 0 ? "text-orange-600 cursor-help" : "text-amber-600")} title={tooltipText}>{impegni > 0 ? impegni : ''}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-blue-600">{tot}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

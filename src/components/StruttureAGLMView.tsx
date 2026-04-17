import React from 'react';
import { Package } from 'lucide-react';
import clsx from 'clsx';
import { Article, Process, Commitment } from '../types';

const aglmItems = [
  { baseCodifica: "0610", dimensioni: "600x1000x400" },
  { baseCodifica: "0810", dimensioni: "800x1000x400" },
  { baseCodifica: "1010", dimensioni: "1000x1000x400" },
  { baseCodifica: "1210", dimensioni: "1200x1000x400" },
  { baseCodifica: "1610", dimensioni: "1600x1000x400" }
];

interface StruttureAGLMViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
}

export default function StruttureAGLMView({ articles, processes, commitments }: StruttureAGLMViewProps) {
  const getLabelAndCode = (category: string, baseCodifica: string, dimensioni: string) => {
    switch(category) {
      case 'str': return { label: "LEGGIO M.", code: `AGLM${baseCodifica}-${dimensioni}` };
      case 'porta': return { label: "PO AGLM", code: `AGLM-PO${baseCodifica}-${dimensioni}` };
      case 'pianale': return { label: "PIANALE MENS.", code: `AGLM${baseCodifica}-${dimensioni}` };
      case 'retro': return { label: "RE AGLM", code: `AGLM-RE${baseCodifica}-${dimensioni}` };
      case 'piastra': return { label: "PA AGLM", code: `AGLM-PA${baseCodifica}-${dimensioni}` };
      case 'mag': return { label: "AGLM COMP.", code: `AGLM${baseCodifica}-${dimensioni}` };
      default: return { label: "ARTICOLO", code: `AGLM${baseCodifica}-${dimensioni}` };
    }
  };

  const getDimensioni = (baseCodifica: string, dimensioni: string, category: 'str' | 'porta' | 'pianale' | 'retro' | 'piastra' | 'mag') => {
    const [w, h, d] = dimensioni.split('x').map(Number);
    if (category === 'str' || category === 'mag') return dimensioni;
    if (category === 'porta' || category === 'retro' || category === 'piastra') return `${w}x${h}`;
    if (category === 'pianale') return `${w}x${d}`;
    return dimensioni;
  };

  const renderTable = (title: string, category: 'str' | 'porta' | 'pianale' | 'retro' | 'piastra' | 'mag') => (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-bold text-slate-800 mb-2 border-b pb-1">{title}</h2>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto flex-grow">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead className="bg-slate-800 text-white uppercase tracking-wider">
            <tr>
              <th className="px-2 py-2 border-r border-slate-700">ARTICOLO</th>
              {category !== 'mag' && category !== 'piastra' && <><th className="px-1 py-1 border-r border-slate-700">TAG.</th><th className="px-1 py-1 border-r border-slate-700">GRE</th><th className="px-1 py-1 border-r border-slate-700">SALD.</th><th className="px-1 py-1 border-r border-slate-700">VER.</th></>}
              {category === 'piastra' && <><th className="px-1 py-1 border-r border-slate-700">TAG.</th><th className="px-1 py-1 border-r border-slate-700">GRE</th></>}
              {category === 'mag' && <th className="px-1 py-1 border-r border-slate-700">MAG</th>}
              <th className="px-1 py-1 border-r border-slate-700">IMP.</th>
              <th className="px-1 py-1">TOT.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {aglmItems.map((item, index) => {
              const { label, code } = getLabelAndCode(category, item.baseCodifica, item.dimensioni);
              const article = articles.find(a => (a.codice || '').toLowerCase() === code.toLowerCase());
              const process = processes.find(p => p.articolo_codice?.toLowerCase() === code.toLowerCase());
              
              const tag = process?.taglio || 0;
              const gre = process?.piega || 0;
              const sald = process?.saldatura || 0;
              const ver = process?.verniciatura || 0;
              const mag = article?.verniciati || 0; // Assuming 'verniciati' is the magazine quantity for now, need to check
              const targetPhase = category === 'piastra' ? 'Piega' : 'Verniciatura';
              const articleCommitments = commitments.filter(c => c.articolo_codice?.toLowerCase() === code.toLowerCase() && c.stato_lavorazione !== 'Completato' && c.fase_produzione === targetPhase);
              const tableImp = articleCommitments.reduce((acc, c) => acc + c.quantita, 0);
              const imp = Math.max(tableImp, article?.impegni_clienti || 0);
              
              const tooltipText = articleCommitments.length > 0 
                ? articleCommitments.map(c => `${c.cliente} - ${c.commessa}: ${c.quantita}pz`).join('\n')
                : undefined;
              
              let disp = 0;
              if (category === 'piastra') disp = article?.piega || 0;
              else disp = article?.verniciati || 0;
              
              const tot = disp - imp;
              
              return (
                <tr key={code} className="h-8 hover:bg-slate-50">
                  <td className="border-r border-slate-200 px-2 py-1">
                    <div className="font-bold text-slate-800 text-[10px]">{label}</div>
                    <div className="text-[9px] text-slate-600 font-mono">{code}</div>
                    <div className="text-[9px] text-slate-500">{getDimensioni(item.baseCodifica, item.dimensioni, category)}</div>
                  </td>
                  {category !== 'mag' && category !== 'piastra' && (
                    <>
                      <td className="border-r border-slate-200 p-0.5 text-center">{tag}</td>
                      <td className="border-r border-slate-200 p-0.5 text-center">{gre}</td>
                      <td className="border-r border-slate-200 p-0.5 text-center">{sald}</td>
                      <td className="border-r border-slate-200 p-0.5 text-center">{ver}</td>
                    </>
                  )}
                  {category === 'piastra' && (
                    <>
                      <td className="border-r border-slate-200 p-0.5 text-center">{tag}</td>
                      <td className="border-r border-slate-200 p-0.5 text-center">{gre}</td>
                    </>
                  )}
                  {category === 'mag' && <td className="border-r border-slate-200 p-1 text-center">{mag}</td>}
                  <td className={clsx("border-r border-slate-200 p-1 text-center font-mono font-bold", imp > 0 ? "text-orange-600 cursor-help" : "")} title={tooltipText}>{imp > 0 ? imp : ''}</td>
                  <td className={clsx("p-1 text-center font-mono font-bold text-[10px]", tot < 0 ? "text-red-600" : "text-slate-700")}>{tot}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-8">LEGGII AGLM</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderTable("STRUTTURE AGLM", 'str')}
        {renderTable("PORTE AGLM", 'porta')}
        {renderTable("PIANALE MENSOLE", 'pianale')}
        {renderTable("RETRI AGLM", 'retro')}
        {renderTable("PIASTRA AGLM", 'piastra')}
        {renderTable("AGLM COMP. MAGAZZINO", 'mag')}
      </div>
    </div>
  );
}

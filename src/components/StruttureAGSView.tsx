import React, { useState } from 'react';
import { Package, Search, Lock, Unlock, ShieldAlert } from 'lucide-react';
import { Article, Process, Commitment } from '../types';
import { getPhaseAvailability } from '../utils';
import { toggleArticleBlock } from '../api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import CommitmentPopup from './CommitmentPopup';

interface StruttureAGSViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  onUpdate: () => void;
}

const misureAGS = [
  "600X1600X400","600X1800X400","600X1800X500","600X1800X600",
  "600X2000X400","600X2000X500","600X2000X600",
  "800X1600X400","800X1600X500","800X1800X400","800X1800X500","800X1800X600",
  "800X2000X400","800X2000X500","800X2000X600",
  "1000X1600X400","1000X1600X500","1000X1600X600",
  "1000X1800X400","1000X1800X500","1000X1800X600",
  "1000X2000X400","1000X2000X500","1000X2000X600",
  "1200X1600X400","1200X1600X500",
  "1200X1800X400","1200X1800X500","1200X1800X600",
  "1200X2000X400","1200X2000X500","1200X2000X600"
];

export default function StruttureAGSView({ articles, processes, commitments, onUpdate }: StruttureAGSViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Popup state
  const [popupData, setPopupData] = useState<{
    isOpen: boolean;
    title: string;
    commitments: Commitment[];
    isBlocked: boolean;
    position: { x: number, y: number } | null;
  }>({
    isOpen: false,
    title: '',
    commitments: [],
    isBlocked: false,
    position: null
  });

  const filteredMisure = misureAGS.filter(m => {
    const nome = `STRUTTURA AGS ${m}`.toLowerCase();
    return nome.includes(searchTerm.toLowerCase());
  });

  const handleToggleBlock = async (id: string) => {
    try {
      await toggleArticleBlock(id);
      onUpdate();
      toast.success('Stato blocco aggiornato');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openPopup = (e: React.MouseEvent, title: string, phaseComm: Commitment[], isBlocked: boolean) => {
    e.stopPropagation();
    if (phaseComm.length === 0 && !isBlocked) return;
    
    setPopupData({
      isOpen: true,
      title,
      commitments: phaseComm,
      isBlocked,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">STRUTTURE AGS</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca misura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all duration-300"
            />
          </div>
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
            {filteredMisure.map(m => {
              const nome = `STRUTTURA AGS ${m}`;
              const shortNome = `AGS ${m}`;
              const article = articles.find(a => 
                a.nome === nome || 
                a.codice === nome || 
                a.nome === shortNome || 
                a.codice === shortNome
              );
              const process = article ? processes.find(p => p.articolo_id === article.id) : undefined;
              const verniciati = article?.verniciati || 0;
              
              // Commitments per phase (Case-insensitive)
              const getCommitmentsForPhase = (phase: string) => 
                article ? commitments.filter(c => 
                  String(c.articolo_id) === String(article.id) && 
                  c.stato_lavorazione !== 'Completato' && 
                  (c.fase_produzione?.toLowerCase() === phase.toLowerCase())
                ) : [];

              const commTaglio = getCommitmentsForPhase('Taglio');
              const commPiega = getCommitmentsForPhase('Piega');
              const commSaldatura = getCommitmentsForPhase('Saldatura');
              const commVerniciatura = getCommitmentsForPhase('Verniciatura');

              const impegni = commVerniciatura.reduce((sum, c) => sum + c.quantita, 0);
              const tot = verniciati - impegni;
              
              const dispTaglio = article ? getPhaseAvailability(article, process, 'taglio', commitments) : 0;
              const dispPiega = article ? getPhaseAvailability(article, process, 'piega', commitments) : 0;
              const dispSaldatura = article ? getPhaseAvailability(article, process, 'saldatura', commitments) : 0;
              const dispVerniciatura = article ? getPhaseAvailability(article, process, 'verniciatura', commitments) : 0;

              return (
                <tr 
                  key={nome} 
                  className={clsx(
                    "h-12 border-b border-slate-100 hover:bg-slate-50 transition-colors",
                    article?.is_blocked && "bg-red-50/50"
                  )}
                >
                  <td 
                    className="border-r border-slate-200 px-4 py-3 font-bold text-slate-700 cursor-pointer hover:bg-red-50/50 group"
                    onClick={() => article && handleToggleBlock(article.id)}
                    title="Clicca per bloccare/sbloccare articolo"
                  >
                    <div className="flex items-center gap-2">
                      {article?.is_blocked && <ShieldAlert className="w-4 h-4 text-red-600" />}
                      <span className={clsx(article?.is_blocked && "text-red-700")}>{nome}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                        {article?.is_blocked ? <Unlock className="w-3 h-3 text-slate-400" /> : <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                  </td>
                  <td 
                    className={clsx(
                      "border-r border-slate-200 px-3 py-3 text-center font-mono", 
                      dispTaglio < 0 ? "bg-red-500 text-white" : commTaglio.length > 0 ? "text-orange-600 font-bold cursor-pointer hover:bg-slate-100" : ""
                    )}
                    onClick={(e) => openPopup(e, `Impegni in fase Taglio`, commTaglio, !!article?.is_blocked)}
                  >
                    {process?.taglio || 0}
                  </td>
                  <td 
                    className={clsx(
                      "border-r border-slate-200 px-3 py-3 text-center font-mono", 
                      dispPiega < 0 ? "bg-red-500 text-white" : commPiega.length > 0 ? "text-orange-600 font-bold cursor-pointer hover:bg-slate-100" : ""
                    )}
                    onClick={(e) => openPopup(e, `Impegni in fase Piega`, commPiega, !!article?.is_blocked)}
                  >
                    {process?.piega || 0}
                  </td>
                  <td 
                    className={clsx(
                      "border-r border-slate-200 px-3 py-3 text-center font-mono", 
                      dispSaldatura < 0 ? "bg-red-500 text-white" : commSaldatura.length > 0 ? "text-orange-600 font-bold cursor-pointer hover:bg-slate-100" : ""
                    )}
                    onClick={(e) => openPopup(e, `Impegni in fase Saldatura`, commSaldatura, !!article?.is_blocked)}
                  >
                    {process?.saldatura || 0}
                  </td>
                  <td 
                    className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono", dispVerniciatura < 0 && "bg-red-500 text-white")}
                  >
                    {verniciati}
                  </td>
                  <td 
                    className={clsx("border-r border-slate-200 px-3 py-3 text-center font-mono font-bold", impegni > 0 ? "text-orange-600 cursor-pointer hover:bg-slate-100" : "text-amber-600")}
                    onClick={(e) => openPopup(e, `Impegni in fase Verniciatura`, commVerniciatura, !!article?.is_blocked)}
                  >
                    {impegni > 0 ? impegni : ''}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-blue-600">{tot}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CommitmentPopup 
        {...popupData}
        onClose={() => setPopupData(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

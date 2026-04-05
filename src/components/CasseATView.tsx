import React, { useState, useEffect } from 'react';
import { Article, Process, Commitment, Macchina5000, TaglioLaser, FaseTaglio } from '../types';
import { fetchArticles, fetchProcesses, fetchCommitments, updateArticle, updateProcess, fetchMacchina5000, fetchTaglioLaser, fetchFaseTaglio, addFaseTaglio, fetchCasseComplete, updateCassaCompleta } from '../api';
import { getCategory, getDisponibilita } from '../utils';
import { toast } from 'react-hot-toast';
import { Save, X, Edit2, Scissors, Play, CheckCircle, AlertCircle, Search } from 'lucide-react';
import clsx from 'clsx';

interface CasseATViewProps {
  username: string;
}

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

export default function CasseATView({ username }: CasseATViewProps) {
  const [piastre, setPiastre] = useState<any[]>([]);
  const [porte, setPorte] = useState<any[]>([]);
  const [involucri, setInvolucri] = useState<any[]>([]);
  const [casseComplete, setCasseComplete] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Machine state
  const [macchina5000, setMacchina5000] = useState<Macchina5000[]>([]);
  const [taglioLaser, setTaglioLaser] = useState<TaglioLaser[]>([]);
  const [faseTaglio, setFaseTaglio] = useState<FaseTaglio[]>([]);
  const [commitmentsState, setCommitmentsState] = useState<Commitment[]>([]);

  // Auto Cut state
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  const [selectedArticleForCut, setSelectedArticleForCut] = useState<any | null>(null);
  const [cutForm, setCutForm] = useState({
    quantita: 0,
    odl: '',
    cliente: 'MAGAZZINO',
    commessa: 'CASSE AT',
    macchina: 'Macchina 5000' as 'Macchina 5000' | 'Taglio Laser'
  });

  // Inline editing state
  const [editingTable, setEditingTable] = useState<'piastre' | 'porte' | 'involucro' | 'casseComplete' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  // Assemblaggio state
  const [asmL, setAsmL] = useState<number>(300);
  const [asmH, setAsmH] = useState<number>(300);
  const [asmP, setAsmP] = useState<number>(150);
  const [asmQ, setAsmQ] = useState<number>(1);

  const [frozenTooltipId, setFrozenTooltipId] = useState<string | null>(null);

  const isAndrea = username === 'Andrea';
  const isOsvaldo = username === 'Osvaldo';
  const isLucaTurati = username === 'LucaTurati';
  const isRobertoBonalumi = username === 'RobertoBonalumi';
  const isAdeleTurati = username === 'AdeleTurati';
  const isDeveloper = username === 'TahaDev';
  const canAutoCut = isAndrea || isOsvaldo || isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;
  const canUseAutoCut = isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;

  const renderPhaseCell = (item: any, value: number, field: string, phase: 'Verniciatura' | 'Grezzo' | 'Taglio' | 'Saldatura', isEditing: boolean, editData: any, handleInputChange: (field: string, value: any) => void) => {
    const isNegative = value < 0;
    const isFrozen = frozenTooltipId === `${item.id}-${phase}-imp`;
    const articleCommitments = (item.commitments || []).filter((c: any) => c.fase_produzione === phase);
    const impCount = articleCommitments.reduce((sum: number, c: any) => sum + c.quantita, 0);

    const tooltipContent = !isEditing && articleCommitments.length > 0 && (() => {
      const grouped = articleCommitments.reduce((acc: any, c: any) => {
        const { month } = parseNote(c.note);
        if (!acc[month]) acc[month] = [];
        acc[month].push(c);
        return acc;
      }, {});

      const sortedMonths = Object.keys(grouped).sort((a, b) => {
        const indexA = mesi.indexOf(a);
        const indexB = mesi.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      return (
        <div className={clsx(
          "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-72 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700 pointer-events-auto",
          isFrozen ? "block" : "hidden group-hover:block"
        )}>
          <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-emerald-400 flex justify-between items-center">
            <div className="flex flex-col">
              <span>Dettaglio Impegni {phase}:</span>
              {isFrozen && <span className="text-[8px] text-amber-400 animate-pulse">MODALITÀ BLOCCO ATTIVA</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-normal italic">Raggruppati per mese</span>
              {isFrozen && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFrozenTooltipId(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {sortedMonths.map(month => (
              <div key={month} className="space-y-1">
                <div className="text-amber-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 flex justify-between items-center">
                  <span>{month}</span>
                  <span className="text-[8px] font-normal text-slate-500">
                    {grouped[month].reduce((sum: number, c: any) => sum + c.quantita, 0)} pz
                  </span>
                </div>
                <ul className="text-left space-y-1.5">
                  {grouped[month].map((c: any) => {
                    const { additionalNote } = parseNote(c.note);
                    return (
                      <li key={c.id} className="flex justify-between items-start border-b border-slate-800/50 pb-1 last:border-0">
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-bold text-slate-100">{c.cliente}</span>
                          <span className="text-[9px] text-slate-400">
                            Commessa: {c.commessa}
                            {additionalNote && <span className="text-emerald-400 ml-1 font-bold">N.B: {additionalNote}</span>}
                          </span>
                        </div>
                        <span className="font-bold text-amber-400 whitespace-nowrap pt-0.5">{c.quantita} pz</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between font-bold text-xs">
            <span>Totale Impegni:</span>
            <span className="text-amber-400">{impCount} pz</span>
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
        </div>
      );
    })();

    return (
      <td 
        onClick={() => {
          if (!isEditing && impCount > 0) {
            setFrozenTooltipId(isFrozen ? null : `${item.id}-${phase}-imp`);
          }
        }}
        className={clsx(
          "border-b border-r border-slate-200 p-1 text-center font-mono text-xs relative group cursor-help transition-all",
          isNegative && !isEditing ? "bg-red-500 text-white font-bold" : "text-slate-600",
          !isEditing && impCount > 0 && "bg-orange-50 text-orange-700 font-bold hover:bg-orange-100",
          isFrozen && "ring-2 ring-inset ring-amber-400 bg-amber-50"
        )}
      >
        {isEditing ? (
          <input 
            type="number" 
            className="w-full text-center border rounded p-0.5 text-slate-800 font-normal" 
            value={editData[field]} 
            onChange={(e) => handleInputChange(field, parseInt(e.target.value) || 0)}
          />
        ) : (
          <>
            {value}
            {tooltipContent}
          </>
        )}
      </td>
    );
  };

  const renderImpCell = (item: any, phase: 'Verniciatura' | 'Grezzo' | 'Taglio' | 'Saldatura' = 'Verniciatura') => {
    const isFrozen = frozenTooltipId === `${item.id}-${phase}-imp`;
    const articleCommitments = (item.commitments || []).filter((c: any) => c.fase_produzione === phase);
    const totalImpCount = phase === 'Verniciatura' ? item.imp : (phase === 'Grezzo' ? item.impGrezzo : (phase === 'Taglio' ? item.impTaglio : item.impSald));

    const tooltipContent = articleCommitments.length > 0 && (() => {
      const grouped = articleCommitments.reduce((acc: any, c: any) => {
        const { month } = parseNote(c.note);
        if (!acc[month]) acc[month] = [];
        acc[month].push(c);
        return acc;
      }, {});

      const sortedMonths = Object.keys(grouped).sort((a, b) => {
        const indexA = mesi.indexOf(a);
        const indexB = mesi.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      return (
        <div className={clsx(
          "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-72 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700 pointer-events-auto",
          isFrozen ? "block" : "hidden group-hover:block"
        )}>
          <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-emerald-400 flex justify-between items-center">
            <div className="flex flex-col">
              <span>Dettaglio Impegni {phase}:</span>
              {isFrozen && <span className="text-[8px] text-amber-400 animate-pulse">MODALITÀ BLOCCO ATTIVA</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 font-normal italic">Raggruppati per mese</span>
              {isFrozen && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFrozenTooltipId(null);
                  }}
                  className="p-1 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {sortedMonths.map(month => (
              <div key={month} className="space-y-1">
                <div className="text-amber-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 flex justify-between items-center">
                  <span>{month}</span>
                  <span className="text-[8px] font-normal text-slate-500">
                    {grouped[month].reduce((sum: number, c: any) => sum + c.quantita, 0)} pz
                  </span>
                </div>
                <ul className="text-left space-y-1.5">
                  {grouped[month].map((c: any) => {
                    const { additionalNote } = parseNote(c.note);
                    return (
                      <li key={c.id} className="flex justify-between items-start border-b border-slate-800/50 pb-1 last:border-0">
                        <div className="flex flex-col truncate pr-2">
                          <span className="font-bold text-slate-100">{c.cliente}</span>
                          <span className="text-[9px] text-slate-400">
                            Commessa: {c.commessa}
                            {additionalNote && <span className="text-emerald-400 ml-1 font-bold">N.B: {additionalNote}</span>}
                          </span>
                        </div>
                        <span className="font-bold text-amber-400 whitespace-nowrap pt-0.5">{c.quantita} pz</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between font-bold text-xs">
            <span>Totale Impegni:</span>
            <span className="text-amber-400">{totalImpCount} pz</span>
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
        </div>
      );
    })();

    return (
      <td 
        onClick={() => {
          if (totalImpCount > 0) {
            setFrozenTooltipId(isFrozen ? null : `${item.id}-${phase}-imp`);
          }
        }}
        className={clsx(
          "border-b border-r border-slate-200 p-1 text-center font-mono text-xs relative group cursor-help transition-all",
          totalImpCount > 0 ? "bg-orange-50 text-orange-700 font-bold hover:bg-orange-100" : "text-slate-400",
          isFrozen && "ring-2 ring-inset ring-amber-400 bg-amber-50"
        )}
      >
        {totalImpCount > 0 ? totalImpCount : ''}
        {tooltipContent}
      </td>
    );
  };

  const renderCassaImpCell = (cassa: any) => {
    const isFrozen = frozenTooltipId === `cassa-${cassa.id}-imp`;
    const cassaCommitments = (commitmentsState || []).filter(c => c.articolo_codice === cassa.articolo && c.stato_lavorazione !== 'Completato');
    const totalImpCount = cassa.impegni || 0;

    const tooltipContent = cassaCommitments.length > 0 && (
      <div className={clsx(
        "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-72 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700 pointer-events-auto",
        isFrozen ? "block" : "hidden group-hover:block"
      )}>
        <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-emerald-400 flex justify-between items-center">
          <div className="flex flex-col">
            <span>Dettaglio Impegni:</span>
            {isFrozen && <span className="text-[8px] text-amber-400 animate-pulse">MODALITÀ BLOCCO ATTIVA</span>}
          </div>
          <div className="flex items-center gap-2">
            {isFrozen && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setFrozenTooltipId(null);
                }}
                className="p-1 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          <ul className="text-left space-y-1.5">
            {cassaCommitments.map((c: any) => {
              const { additionalNote } = parseNote(c.note);
              return (
                <li key={c.id} className="flex justify-between items-start border-b border-slate-800/50 pb-1 last:border-0">
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-bold text-slate-100">{c.cliente}</span>
                    <span className="text-[9px] text-slate-400">
                      Commessa: {c.commessa}
                      {additionalNote && <span className="text-emerald-400 ml-1 font-bold">N.B: {additionalNote}</span>}
                    </span>
                  </div>
                  <span className="font-bold text-amber-400 whitespace-nowrap pt-0.5">{c.quantita} pz</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between font-bold text-xs">
          <span>Totale Impegni:</span>
          <span className="text-amber-400">{totalImpCount} pz</span>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700"></div>
      </div>
    );

    return (
      <td 
        onClick={() => {
          if (totalImpCount > 0) {
            setFrozenTooltipId(isFrozen ? null : `cassa-${cassa.id}-imp`);
          }
        }}
        className={clsx(
          "border-b border-r border-slate-200 p-1 text-center font-mono text-xs relative group cursor-help transition-all",
          totalImpCount > 0 ? "bg-orange-50 text-orange-700 font-bold hover:bg-orange-100" : "text-slate-400",
          isFrozen && "ring-2 ring-inset ring-amber-400 bg-amber-50"
        )}
      >
        {totalImpCount > 0 ? totalImpCount : ''}
        {tooltipContent}
      </td>
    );
  };

  const fetchData = async () => {
    try {
      const [articles, processes, commitments, m5000, tLaser, fTaglio, casseCompleteData] = await Promise.all([
        fetchArticles(),
        fetchProcesses(),
        fetchCommitments(),
        fetchMacchina5000(),
        fetchTaglioLaser(),
        fetchFaseTaglio(),
        fetchCasseComplete()
      ]);

      setMacchina5000(m5000);
      setTaglioLaser(tLaser);
      setFaseTaglio(fTaglio);
      setCasseComplete(casseCompleteData);
      setCommitmentsState(commitments);

      const mapData = (famiglia: string) => {
        const mapped = articles
          .filter(a => getCategory(a.nome, a.codice) === famiglia)
          .map(a => {
            const p = processes.find(proc => proc.articolo_id === a.id) || { taglio: 0, piega: 0, saldatura: 0, verniciatura: 0 };
            const articleCommitments = commitments.filter(c => c.articolo_id === a.id && c.stato_lavorazione !== 'Completato');
            const impVern = articleCommitments.filter(c => c.fase_produzione === 'Verniciatura').reduce((sum, c) => sum + c.quantita, 0);
            const impGrezzo = articleCommitments.filter(c => c.fase_produzione === 'Grezzo').reduce((sum, c) => sum + c.quantita, 0);
            const impTaglio = articleCommitments.filter(c => c.fase_produzione === 'Taglio').reduce((sum, c) => sum + c.quantita, 0);
            const impSald = articleCommitments.filter(c => c.fase_produzione === 'Saldatura').reduce((sum, c) => sum + c.quantita, 0);
            
            const tableImp = articleCommitments.reduce((sum, c) => sum + c.quantita, 0);
            const totalImp = Math.max(tableImp, a.impegni_clienti || 0);

            return {
              id: a.id,
              articolo: a.nome,
              codice: a.codice,
              tag: p.taglio || 0,
              gre: p.piega || 0,
              sald: p.saldatura || 0,
              vern: a.verniciati || 0,
              mag: a.scorta || 0,
              tot: (famiglia === 'PIASTRE AT' ? (p.piega || 0) : (a.verniciati || 0)) - totalImp,
              imp: totalImp,
              impGrezzo,
              impTaglio,
              impSald,
              commitments: articleCommitments,
              articleData: a,
              processData: p
            };
          });

        return mapped.sort((a, b) => {
          const extractDims = (name: string) => {
            const match = name.match(/(\d+)[Xx](\d+)(?:[Xx](\d+))?/);
            if (match) {
              const l = parseInt(match[1]) || 0;
              const h = parseInt(match[2]) || 0;
              const p = parseInt(match[3]) || 0;
              return { l, h, p };
            }
            return { l: 0, h: 0, p: 0 };
          };

          const dimsA = extractDims(a.articolo);
          const dimsB = extractDims(b.articolo);

          if (dimsA.l !== dimsB.l) return dimsA.l - dimsB.l;
          if (dimsA.h !== dimsB.h) return dimsA.h - dimsB.h;
          return dimsA.p - dimsB.p;
        });
      };

      setPiastre(mapData('PIASTRE AT'));
      setPorte(mapData('PORTE AT'));
      setInvolucri(mapData('INVOLUCRI AT'));
    } catch (error) {
      console.error('Error fetching Casse AT data:', error);
      toast.error('Errore nel caricamento dei dati Casse AT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const startEditing = (table: 'piastre' | 'porte' | 'involucro' | 'casseComplete', item: any) => {
    setEditingTable(table);
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const cancelEditing = () => {
    setEditingTable(null);
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async () => {
    if (!editingTable || editingId === null || !editData) return;

    try {
      if (editingTable === 'casseComplete') {
        const { quantita, impegni } = editData;
        await updateCassaCompleta(editingId, {
          quantita,
          impegni,
          totale: quantita - impegni
        });
      } else {
        const { articleData, processData, tag, gre, sald, vern, mag } = editData;
        
        // Update process
        await updateProcess(processData.id, {
          ...processData,
          taglio: tag,
          piega: gre,
          saldatura: sald
        });

        // Update article
        await updateArticle(articleData.id, {
          ...articleData,
          nome: editData.articolo,
          codice: editData.codice,
          verniciati: vern,
          scorta: mag
        });
      }

      toast.success('Dati aggiornati con successo');
      fetchData();
      cancelEditing();
    } catch (error) {
      console.error('Error updating Casse AT data:', error);
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAutoCut = async () => {
    if (!selectedArticleForCut) return;
    try {
      await addFaseTaglio({
        lavorazione_per: cutForm.cliente,
        articolo: selectedArticleForCut.articolo,
        quantita: cutForm.quantita,
        data: new Date().toISOString().split('T')[0],
        fatto: 0,
        stampato: 0,
        odl: cutForm.odl || null,
        commessa: cutForm.commessa || null,
        macchina: cutForm.macchina
      });

      toast.success(`Articolo ${selectedArticleForCut.articolo} inviato a RidaTecnico per ${cutForm.macchina}`);
      setIsCutModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Errore nell'invio: " + error.message);
    }
  };

  const openCutModal = (item: any) => {
    const disp = (item.vern || item.gre || 0) - (item.imp || 0);
    const pipeline = (item.tag || 0) + (item.gre || 0) + (item.sald || 0);
    
    // Suggested quantity is the absolute value of negative availability minus what's already in the pipeline
    const suggestedQty = disp < 0 ? Math.max(0, Math.abs(disp) - pipeline) : 0;

    setSelectedArticleForCut(item);
    setCutForm({
      quantita: suggestedQty,
      odl: '',
      cliente: 'MAGAZZINO',
      commessa: 'CASSE AT',
      macchina: (isOsvaldo && !isAndrea && !isLucaTurati && !isRobertoBonalumi && !isDeveloper) ? 'Taglio Laser' : 'Macchina 5000'
    });
    setIsCutModalOpen(true);
  };

  const handleAssemblaggio = async () => {
    try {
      const L = asmL;
      const H = asmH;
      const P = asmP;
      const Q = asmQ;

      if (Q <= 0) {
        toast.error('Quantità deve essere maggiore di 0');
        return;
      }

      // Find Piastra
      const piastraName = `PIASTRA AT ${L}X${H}`;
      const piastra = piastre.find(p => p.articolo === piastraName);

      // Find Involucro
      const invName = `INVOLUCRO AT ${L}X${H}X${P}`;
      const inv = involucri.find(i => i.articolo === invName);

      // Find Porte
      const porteTypes = L >= 800 ? ['IB', 'CB'] : ['STD'];
      const porteToUpdate = porteTypes.map(type => {
        const pName = `PORTA AT ${L}X${H} ${type}`;
        return porte.find(p => p.articolo === pName);
      });

      // Find Cassa Completa
      const cassaName = `CASSA AT COMPL. ${L}X${H}X${P}`;
      const cassa = casseComplete.find(c => c.articolo === cassaName);

      if (!piastra) {
        toast.error(`Piastra non trovata: ${piastraName}`);
        return;
      }
      if (!inv) {
        toast.error(`Involucro non trovato: ${invName}`);
        return;
      }
      if (porteToUpdate.some(p => !p)) {
        toast.error(`Una o più porte non trovate per ${L}X${H}`);
        return;
      }
      if (!cassa) {
        toast.error(`Cassa completa non trovata in magazzino: ${cassaName}`);
        return;
      }

      // Check availability
      if (inv.vern < Q) {
        toast.error(`Involucri VERN insufficienti (${inv.vern} < ${Q})`);
        return;
      }
      if (piastra.gre < Q) {
        toast.error(`Piastre GRE insufficienti (${piastra.gre} < ${Q})`);
        return;
      }
      for (const p of porteToUpdate) {
        if (p!.vern < Q) {
          toast.error(`Porte ${p!.articolo} VERN insufficienti (${p!.vern} < ${Q})`);
          return;
        }
      }

      // Update Involucro
      await updateArticle(inv.articleData.id, {
        ...inv.articleData,
        verniciati: inv.vern - Q
      });

      // Update Piastra
      await updateProcess(piastra.processData.id, {
        ...piastra.processData,
        piega: piastra.gre - Q
      });

      // Update Porte
      for (const p of porteToUpdate) {
        await updateArticle(p!.articleData.id, {
          ...p!.articleData,
          verniciati: p!.vern - Q
        });
      }

      // Update Cassa Completa
      await updateCassaCompleta(cassa.id, {
        quantita: cassa.quantita + Q,
        impegni: cassa.impegni,
        totale: (cassa.quantita + Q) - cassa.impegni
      });

      toast.success('Cassa prodotta con successo!');
      fetchData();
    } catch (error) {
      console.error('Errore durante l\'assemblaggio:', error);
      toast.error('Errore durante l\'assemblaggio');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Dashboard Casse AT</h1>
        <p className="text-slate-500">Monitoraggio e gestione produzione Casse AT</p>
      </div>

      <div className="flex flex-row gap-6 overflow-x-auto pb-8 items-start">
        {/* Tabella 1: PIASTRE AT */}
        <div className="flex-1 min-w-[320px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">PIASTRE AT</h3>
          </div>
          <div className="flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 font-semibold border-b border-r border-slate-300 text-center w-24">MISURA</th>
                  {canAutoCut && <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Auto</th>}
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">GRE.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Tot.</th>
                  {isDeveloper && <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-10">Azioni</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {piastre.map((item) => {
                  const isEditing = editingTable === 'piastre' && editingId === item.id;
                  const total = item.tot;
                  return (
                    <tr key={item.id} className="h-12 hover:bg-slate-50 transition-colors">
                      <td className="border-b border-r border-slate-200 p-1 text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text" 
                              placeholder="Articolo"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.articolo || ''} 
                              onChange={(e) => handleInputChange('articolo', e.target.value)}
                            />
                            <input 
                              type="text" 
                              placeholder="Codice"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.codice || ''} 
                              onChange={(e) => handleInputChange('codice', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700">{item.articolo || '-'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.codice || '-'}</span>
                          </div>
                        )}
                      </td>
                      {canAutoCut && (
                        <td className="px-1 py-1 border-b border-r border-slate-200 text-center">
                          {(() => {
                            const activeTask = macchina5000.find(m => m.articolo === item.articolo && m.stato !== 'completato') || 
                                               taglioLaser.find(m => m.articolo === item.articolo && m.stato !== 'completato');
                            const taskStatus = activeTask?.stato;
                            const pendingRequest = faseTaglio.find(f => f.articolo === item.articolo && f.fatto === 0);
                            const isRequestSent = !!pendingRequest;
                            
                            const disp = (item.vern || item.gre || 0) - (item.imp || 0);
                            const pipeline = (item.tag || 0) + (item.gre || 0) + (item.sald || 0);
                            const isSatisfied = disp >= 0;
                            
                            let buttonClass = "";
                            let tooltip = "";

                            if (canUseAutoCut) {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800 border border-slate-600";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300";
                                tooltip = "in lavorazione";
                              } else if (taskStatus === 'da tagliare') {
                                const machineName = macchina5000.find(m => m.articolo === item.articolo && m.stato === 'da tagliare') ? 'Macchina 5000' : 'Taglio Laser';
                                buttonClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300";
                                tooltip = `programma inviato ${machineName}`;
                              } else if (isRequestSent) {
                                buttonClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300";
                                tooltip = "richiesta inviata all'ufficio programmazione";
                              } else {
                                if (item.tag > 0) {
                                  buttonClass = "bg-transparent text-slate-900 hover:bg-slate-100";
                                  tooltip = "Carico di taglio effettuato";
                                } else if (isSatisfied) {
                                  buttonClass = "bg-transparent text-slate-300/30 hover:bg-slate-100 hover:text-slate-400";
                                  tooltip = "Impegno soddisfatto";
                                } else {
                                  buttonClass = "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200";
                                  tooltip = "Invia alla Macchina 5000/Taglio Laser";
                                }
                              }
                            } else {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'da tagliare') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-400 text-slate-900 hover:bg-yellow-500";
                              } else {
                                buttonClass = disp < 0 ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200";
                              }
                              if (!tooltip) {
                                tooltip = !canUseAutoCut ? "Non hai i permessi per utilizzare questa funzione" : (taskStatus ? `Stato Macchina: ${taskStatus}` : "Invia alla Macchina 5000/Taglio Laser");
                              }
                            }

                            return (
                              <button
                                onClick={() => canUseAutoCut && openCutModal(item)}
                                disabled={!canUseAutoCut}
                                className={clsx(
                                  "p-1.5 rounded-lg transition-all shadow-sm",
                                  canUseAutoCut ? "hover:scale-110 active:scale-95 cursor-pointer" : "opacity-50 cursor-not-allowed",
                                  buttonClass
                                )}
                                title={tooltip}
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}
                        </td>
                      )}
                      {renderPhaseCell(item, item.tag, 'tag', 'Taglio', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.gre, 'gre', 'Grezzo', isEditing, editData, handleInputChange)}
                      <td className={clsx(
                        "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-bold",
                        total < 0 ? "text-white bg-red-500" : "text-blue-600"
                      )}>
                        {total}
                      </td>
                      {isDeveloper && (
                        <td className="border-b border-slate-200 p-1 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Save className="h-3.5 w-3.5" /></button>
                              <button onClick={cancelEditing} className="text-red-600 hover:text-red-800"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEditing('piastre', item)} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabella 2: PORTE AT */}
        <div className="flex-1 min-w-[380px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">PORTE AT</h3>
          </div>
          <div className="flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 font-semibold border-b border-r border-slate-300 text-center w-24">MISURA</th>
                  {canAutoCut && <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Auto</th>}
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">GRE.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">VERN.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8 text-amber-600">Imp.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Tot.</th>
                  {isDeveloper && <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-10">Azioni</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {porte.map((item) => {
                  const isEditing = editingTable === 'porte' && editingId === item.id;
                  const total = item.tot;
                  return (
                    <tr key={item.id} className="h-12 hover:bg-slate-50 transition-colors">
                      <td className="border-b border-r border-slate-200 p-1 text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text" 
                              placeholder="Articolo"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.articolo || ''} 
                              onChange={(e) => handleInputChange('articolo', e.target.value)}
                            />
                            <input 
                              type="text" 
                              placeholder="Codice"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.codice || ''} 
                              onChange={(e) => handleInputChange('codice', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700">{item.articolo || '-'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.codice || '-'}</span>
                          </div>
                        )}
                      </td>
                      {canAutoCut && (
                        <td className="px-1 py-1 border-b border-r border-slate-200 text-center">
                          {(() => {
                            const activeTask = macchina5000.find(m => m.articolo === item.articolo && m.stato !== 'completato') || 
                                               taglioLaser.find(m => m.articolo === item.articolo && m.stato !== 'completato');
                            const taskStatus = activeTask?.stato;
                            const pendingRequest = faseTaglio.find(f => f.articolo === item.articolo && f.fatto === 0);
                            const isRequestSent = !!pendingRequest;
                            
                            const disp = (item.vern || item.gre || 0) - (item.imp || 0);
                            const pipeline = (item.tag || 0) + (item.gre || 0) + (item.sald || 0);
                            const isSatisfied = disp >= 0;
                            
                            let buttonClass = "";
                            let tooltip = "";

                            if (canUseAutoCut) {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800 border border-slate-600";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300";
                                tooltip = "in lavorazione";
                              } else if (taskStatus === 'da tagliare') {
                                const machineName = macchina5000.find(m => m.articolo === item.articolo && m.stato === 'da tagliare') ? 'Macchina 5000' : 'Taglio Laser';
                                buttonClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300";
                                tooltip = `programma inviato ${machineName}`;
                              } else if (isRequestSent) {
                                buttonClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300";
                                tooltip = "richiesta inviata all'ufficio programmazione";
                              } else {
                                if (item.tag > 0) {
                                  buttonClass = "bg-transparent text-slate-900 hover:bg-slate-100";
                                  tooltip = "Carico di taglio effettuato";
                                } else if (isSatisfied) {
                                  buttonClass = "bg-transparent text-slate-300/30 hover:bg-slate-100 hover:text-slate-400";
                                  tooltip = "Impegno soddisfatto";
                                } else {
                                  buttonClass = "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200";
                                  tooltip = "Invia alla Macchina 5000/Taglio Laser";
                                }
                              }
                            } else {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'da tagliare') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-400 text-slate-900 hover:bg-yellow-500";
                              } else {
                                buttonClass = disp < 0 ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200";
                              }
                              if (!tooltip) {
                                tooltip = !canUseAutoCut ? "Non hai i permessi per utilizzare questa funzione" : (taskStatus ? `Stato Macchina: ${taskStatus}` : "Invia alla Macchina 5000/Taglio Laser");
                              }
                            }

                            return (
                              <button
                                onClick={() => canUseAutoCut && openCutModal(item)}
                                disabled={!canUseAutoCut}
                                className={clsx(
                                  "p-1.5 rounded-lg transition-all shadow-sm",
                                  canUseAutoCut ? "hover:scale-110 active:scale-95 cursor-pointer" : "opacity-50 cursor-not-allowed",
                                  buttonClass
                                )}
                                title={tooltip}
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}
                        </td>
                      )}
                      {renderPhaseCell(item, item.tag, 'tag', 'Taglio', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.gre, 'gre', 'Grezzo', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.vern, 'vern', 'Verniciatura', isEditing, editData, handleInputChange)}
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-amber-600 font-bold">
                        {item.imp}
                      </td>
                      <td className={clsx(
                        "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-bold",
                        total < 0 ? "text-white bg-red-500" : "text-blue-600"
                      )}>
                        {total}
                      </td>
                      {isDeveloper && (
                        <td className="border-b border-slate-200 p-1 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Save className="h-3.5 w-3.5" /></button>
                              <button onClick={cancelEditing} className="text-red-600 hover:text-red-800"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEditing('porte', item)} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabella 3: INVOLUCRO AT */}
        <div className="flex-[1.5] min-w-[550px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">INVOLUCRO AT</h3>
          </div>
          <div className="flex-1">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center w-32">MISURA CASSA</th>
                  {canAutoCut && <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Auto</th>}
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">GRE.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">SALD.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">VERN.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8 text-amber-600">Imp.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Tot.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-8">Mag.</th>
                  {isDeveloper && <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-10">Azioni</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {involucri.map((item) => {
                  const isEditing = editingTable === 'involucro' && editingId === item.id;
                  const total = item.tot;
                  return (
                    <tr key={item.id} className="h-12 hover:bg-slate-50 transition-colors">
                      <td className="border-b border-r border-slate-200 p-1 text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text" 
                              placeholder="Articolo"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.articolo || ''} 
                              onChange={(e) => handleInputChange('articolo', e.target.value)}
                            />
                            <input 
                              type="text" 
                              placeholder="Codice"
                              className="w-full text-center border rounded p-0.5 text-[10px]" 
                              value={editData.codice || ''} 
                              onChange={(e) => handleInputChange('codice', e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700">{item.articolo || '-'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.codice || '-'}</span>
                          </div>
                        )}
                      </td>
                      {canAutoCut && (
                        <td className="px-1 py-1 border-b border-r border-slate-200 text-center">
                          {(() => {
                            const activeTask = macchina5000.find(m => m.articolo === item.articolo && m.stato !== 'completato') || 
                                               taglioLaser.find(m => m.articolo === item.articolo && m.stato !== 'completato');
                            const taskStatus = activeTask?.stato;
                            const pendingRequest = faseTaglio.find(f => f.articolo === item.articolo && f.fatto === 0);
                            const isRequestSent = !!pendingRequest;
                            
                            const disp = (item.vern || item.gre || 0) - (item.imp || 0);
                            const pipeline = (item.tag || 0) + (item.gre || 0) + (item.sald || 0);
                            const isSatisfied = disp >= 0;
                            
                            let buttonClass = "";
                            let tooltip = "";

                            if (canUseAutoCut) {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800 border border-slate-600";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300";
                                tooltip = "in lavorazione";
                              } else if (taskStatus === 'da tagliare') {
                                const machineName = macchina5000.find(m => m.articolo === item.articolo && m.stato === 'da tagliare') ? 'Macchina 5000' : 'Taglio Laser';
                                buttonClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300";
                                tooltip = `programma inviato ${machineName}`;
                              } else if (isRequestSent) {
                                buttonClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300";
                                tooltip = "richiesta inviata all'ufficio programmazione";
                              } else {
                                if (item.tag > 0) {
                                  buttonClass = "bg-transparent text-slate-900 hover:bg-slate-100";
                                  tooltip = "Carico di taglio effettuato";
                                } else if (isSatisfied) {
                                  buttonClass = "bg-transparent text-slate-300/30 hover:bg-slate-100 hover:text-slate-400";
                                  tooltip = "Impegno soddisfatto";
                                } else {
                                  buttonClass = "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200";
                                  tooltip = "Invia alla Macchina 5000/Taglio Laser";
                                }
                              }
                            } else {
                              if (taskStatus === 'in pausa') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                                tooltip = "lavorazione in pausa";
                              } else if (taskStatus === 'da tagliare') {
                                buttonClass = "bg-slate-700 text-white hover:bg-slate-800";
                              } else if (taskStatus === 'in lavorazione') {
                                buttonClass = "bg-yellow-400 text-slate-900 hover:bg-yellow-500";
                              } else {
                                buttonClass = disp < 0 ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200";
                              }
                              if (!tooltip) {
                                tooltip = !canUseAutoCut ? "Non hai i permessi per utilizzare questa funzione" : (taskStatus ? `Stato Macchina: ${taskStatus}` : "Invia alla Macchina 5000/Taglio Laser");
                              }
                            }

                            return (
                              <button
                                onClick={() => canUseAutoCut && openCutModal(item)}
                                disabled={!canUseAutoCut}
                                className={clsx(
                                  "p-1.5 rounded-lg transition-all shadow-sm",
                                  canUseAutoCut ? "hover:scale-110 active:scale-95 cursor-pointer" : "opacity-50 cursor-not-allowed",
                                  buttonClass
                                )}
                                title={tooltip}
                              >
                                <Scissors className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}
                        </td>
                      )}
                      {renderPhaseCell(item, item.tag, 'tag', 'Taglio', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.gre, 'gre', 'Grezzo', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.sald, 'sald', 'Saldatura', isEditing, editData, handleInputChange)}
                      {renderPhaseCell(item, item.vern, 'vern', 'Verniciatura', isEditing, editData, handleInputChange)}
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-amber-600 font-bold">
                        {item.imp}
                      </td>
                      <td className={clsx(
                        "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-bold",
                        total < 0 ? "text-white bg-red-500" : "text-blue-600"
                      )}>
                        {total}
                      </td>
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-slate-600">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full text-center border rounded p-0.5" 
                            value={editData.mag} 
                            onChange={(e) => handleInputChange('mag', parseInt(e.target.value) || 0)}
                          />
                        ) : item.mag}
                      </td>
                      {isDeveloper && (
                        <td className="border-b border-slate-200 p-1 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Save className="h-3.5 w-3.5" /></button>
                              <button onClick={cancelEditing} className="text-red-600 hover:text-red-800"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          ) : (
                            <button onClick={() => startEditing('involucro', item)} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-3.5 w-3.5" /></button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tabella 4: CASSE COMPLETE MAGAZZINO */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
          <h3 className="font-bold uppercase tracking-wider text-sm text-center">CASSE COMPLETE MAGAZZINO</h3>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 font-semibold border-b border-r border-slate-300 text-left">ARTICOLO</th>
                <th className="px-2 py-2 font-semibold border-b border-r border-slate-300 text-center w-24">QUANTITÀ</th>
                <th className="px-2 py-2 font-semibold border-b border-r border-slate-300 text-center w-24">IMPEGNI</th>
                <th className="px-2 py-2 font-semibold border-b border-slate-300 text-center w-24">TOTALE</th>
                {isDeveloper && <th className="px-2 py-2 font-semibold border-b border-slate-300 text-center w-16">AZIONI</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {casseComplete.map((item) => {
                const isNegative = item.totale < 0;
                const isEditing = editingTable === 'casseComplete' && editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border-b border-r border-slate-200 px-4 py-1.5 font-medium text-slate-800 text-xs truncate">
                      {item.articolo}
                    </td>
                    <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-slate-600">
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="w-full text-center border rounded p-0.5" 
                          value={editData.quantita} 
                          onChange={(e) => handleInputChange('quantita', parseInt(e.target.value) || 0)}
                        />
                      ) : item.quantita}
                    </td>
                    {isEditing ? (
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-amber-600 font-bold">
                        <input 
                          type="number" 
                          className="w-full text-center border rounded p-0.5" 
                          value={editData.impegni} 
                          onChange={(e) => handleInputChange('impegni', parseInt(e.target.value) || 0)}
                        />
                      </td>
                    ) : renderCassaImpCell(item)}
                    <td className={clsx(
                      "border-b border-slate-200 p-1 text-center font-mono text-xs font-bold",
                      isNegative ? "bg-red-500 text-white" : "text-blue-600"
                    )}>
                      {isEditing ? (editData.quantita - editData.impegni) : item.totale}
                    </td>
                    {isDeveloper && (
                      <td className="border-b border-slate-200 p-1 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={saveEdit} className="text-green-600 hover:text-green-800"><Save className="h-3.5 w-3.5" /></button>
                            <button onClick={cancelEditing} className="text-red-600 hover:text-red-800"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing('casseComplete', item)} className="text-blue-600 hover:text-blue-800"><Edit2 className="h-3.5 w-3.5" /></button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sezione Assemblaggio */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-3xl">
        <div className="bg-slate-800 text-white px-4 py-3">
          <h3 className="font-bold uppercase tracking-wider text-sm">ASSEMBLAGGIO CASSA AT</h3>
        </div>
        <div className="p-6 flex flex-wrap gap-6 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase">L (Larghezza)</label>
            <input 
              type="number" 
              className="border border-slate-300 rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={asmL}
              onChange={(e) => setAsmL(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase">H (Altezza)</label>
            <input 
              type="number" 
              className="border border-slate-300 rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={asmH}
              onChange={(e) => setAsmH(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase">P (Profondità)</label>
            <input 
              type="number" 
              className="border border-slate-300 rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={asmP}
              onChange={(e) => setAsmP(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Quantità</label>
            <input 
              type="number" 
              className="border border-slate-300 rounded-lg px-3 py-2 w-24 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-blue-600"
              value={asmQ}
              onChange={(e) => setAsmQ(parseInt(e.target.value) || 0)}
            />
          </div>
          <button 
            onClick={handleAssemblaggio}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-sm h-[42px]"
          >
            Produci Cassa
          </button>
        </div>
      </div>

      {/* Modal for Auto Cut */}
      {isCutModalOpen && selectedArticleForCut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-2 rounded-lg">
                  <Scissors className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Invia alla Macchina 5000/Taglio Laser</h3>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Automazione Casse AT</p>
                </div>
              </div>
              <button onClick={() => setIsCutModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Articolo Selezionato</div>
                <div className="font-bold text-slate-800">{selectedArticleForCut.articolo}</div>
                <div className="text-xs text-slate-500 font-mono">{selectedArticleForCut.codice}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">Quantità da Tagliare</label>
                  <input
                    type="number"
                    value={cutForm.quantita}
                    onChange={(e) => setCutForm({ ...cutForm, quantita: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono font-bold text-lg"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">N. ODL (Opzionale)</label>
                  <input
                    type="text"
                    value={cutForm.odl}
                    onChange={(e) => setCutForm({ ...cutForm, odl: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Es. 12345"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Cliente</label>
                <input
                  type="text"
                  value={cutForm.cliente}
                  onChange={(e) => setCutForm({ ...cutForm, cliente: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">N. Commessa</label>
                <input
                  type="text"
                  value={cutForm.commessa}
                  onChange={(e) => setCutForm({ ...cutForm, commessa: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">Seleziona Macchina</label>
                <select
                  value={cutForm.macchina}
                  onChange={(e) => setCutForm({ ...cutForm, macchina: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium"
                >
                  {(isAndrea || isLucaTurati || isRobertoBonalumi || isDeveloper) && <option value="Macchina 5000">Macchina 5000</option>}
                  {(isOsvaldo || isLucaTurati || isRobertoBonalumi || isDeveloper) && <option value="Taglio Laser">Taglio Laser</option>}
                </select>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setIsCutModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                ANNULLA
              </button>
              <button
                onClick={handleAutoCut}
                disabled={cutForm.quantita <= 0}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                CONFERMA TAGLIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Article, Process, Commitment } from '../types';
import { getDisponibilita } from '../utils';
import { Search, Package, Edit2, CheckCircle, X, Save } from 'lucide-react';
import clsx from 'clsx';
import { updateArticle, updateProcess, addArticle, addMovementLog } from '../api';
import { toast } from 'react-hot-toast';

interface AGMPopupProps {
  title: string;
  commitments: Commitment[];
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
}

const AGMPopup = ({ title, commitments, onClose, popupRef }: AGMPopupProps) => {
  const totalQty = commitments.reduce((sum, c) => sum + c.quantita, 0);
  
  return (
    <div 
      ref={popupRef}
      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-[300px] bg-[#0f172a] text-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-4 text-left cursor-default border border-slate-700 animate-in fade-in zoom-in-95 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h4 className="font-bold text-[13px] text-slate-100">Impegni in fase {title}</h4>
        <div className="flex items-center gap-2">
          <div className="bg-slate-200 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full leading-none">
            {totalQty}
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Stato */}
      <div className="text-[9px] text-orange-400 font-black uppercase tracking-widest mb-2">
        MODALITÀ BLOCCO ATTIVA
      </div>
      
      {/* Divider */}
      <div className="h-[1px] bg-slate-700/50 my-2"></div>
      
      {/* Lista Elementi */}
      <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
        {commitments.map(c => (
          <div key={c.id} className="flex flex-col gap-0.5 group">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-[13px] text-slate-100 truncate pr-2">{c.cliente}</span>
              <span className="font-bold text-[13px] text-white shrink-0">{c.quantita}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate font-medium group-hover:text-slate-300 transition-colors">
              {c.commessa || 'Nessuna commessa'}
            </div>
          </div>
        ))}
        {commitments.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-xs italic">
            Nessun impegno trovato
          </div>
        )}
      </div>
    </div>
  );
};

interface StruttureAGMViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  onUpdate: () => void;
}

export default function StruttureAGMView({ articles, processes, commitments, onUpdate }: StruttureAGMViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setActivePopupId(null);
      }
    };

    if (activePopupId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePopupId]);

  const [formData, setFormData] = useState({
    saldatura: 0,
    verniciati: 0,
    impegni_clienti: 0,
    scorta: 0
  });

  const foTtArticles = useMemo(() => {
    return articles.filter(a => a.codice.startsWith('AGM-FO') || a.codice.startsWith('AGM-TT'));
  }, [articles]);

  const fianchiArticles = useMemo(() => {
    return articles.filter(a => a.codice.startsWith('AGM') && a.codice.endsWith('PL'));
  }, [articles]);

  const struttureArticles = useMemo(() => {
    return articles.filter(a => 
      a.codice.startsWith('AGM') && 
      !a.codice.startsWith('AGM-FO') && 
      !a.codice.startsWith('AGM-TT') && 
      !a.codice.endsWith('PL')
    );
  }, [articles]);

  const filteredFoTt = useMemo(() => {
    return foTtArticles.filter(a => 
      (a.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (a.codice || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      const codeA = a.codice || '';
      const codeB = b.codice || '';
      
      // Extract numeric part (dimensions) to group FO and TT of same size together
      // FO0604 vs TT0604 -> both have 0604
      const dimA = codeA.match(/\d+/)?.[0] || '';
      const dimB = codeB.match(/\d+/)?.[0] || '';
      
      if (dimA !== dimB) {
        return dimA.localeCompare(dimB);
      }
      
      // If same dimensions, FO comes before TT alphabetically
      return codeA.localeCompare(codeB);
    });
  }, [foTtArticles, searchQuery]);

  const filteredFianchi = useMemo(() => {
    return fianchiArticles.filter(a => 
      (a.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (a.codice || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (a.codice || '').localeCompare(b.codice || ''));
  }, [fianchiArticles, searchQuery]);

  const filteredStrutture = useMemo(() => {
    return struttureArticles.filter(a => 
      (a.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (a.codice || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      // Sort by dimensions to match the original table order
      const matchA = (a.nome || '').match(/(\d+)X(\d+)X(\d+)/i);
      const matchB = (b.nome || '').match(/(\d+)X(\d+)X(\d+)/i);
      if (matchA && matchB) {
        const wA = parseInt(matchA[1]);
        const wB = parseInt(matchB[1]);
        if (wA !== wB) return wA - wB;
        const hA = parseInt(matchA[2]);
        const hB = parseInt(matchB[2]);
        if (hA !== hB) return hA - hB;
        const dA = parseInt(matchA[3]);
        const dB = parseInt(matchB[3]);
        return dA - dB;
      }
      return (a.nome || '').localeCompare(b.nome || '');
    });
  }, [struttureArticles, searchQuery]);

  type TableType = 'strutture' | 'fott' | 'fianchi';

  const handleEdit = (article: Article, type: TableType = 'strutture') => {
    const process = processes.find(p => p.articolo_id === article.id);
    setEditingId(article.id);
    setFormData({
      saldatura: type === 'strutture' ? (process?.saldatura || 0) : (process?.piega || 0),
      verniciati: article.verniciati || 0,
      impegni_clienti: article.impegni_clienti || 0,
      scorta: article.scorta || 0
    });
  };

  const handleSave = async (id: string, type: TableType = 'strutture') => {
    try {
      const article = articles.find(a => a.id === id);
      const process = processes.find(p => p.articolo_id === id);
      if (!article) return;

      // Logica scarico automatico componenti AGM
      if (type === 'strutture' && (article.nome.includes('AGM') || article.codice.includes('AGM'))) {
        const match = article.codice.match(/AGM(\d{2})(\d{2})(\d{2})/);
        
        if (match) {
          const [_, larg, prof, spess] = match;
          
          const deltaSaldatura = formData.saldatura - (process?.saldatura || 0);
          
          if (deltaSaldatura > 0) {
            const componenti = [
              { 
                nome: `FONDO AGM ${larg}${spess}`, 
                altCodice: `AGM-FO${larg}${spess}`, 
                qta: 1 
              },
              { 
                nome: `TETTO AGM ${larg}${spess}`, 
                altCodice: `AGM-TT${larg}${spess}`, 
                qta: 1 
              },
              { 
                nome: `FIANCHI AGM ${prof}${spess}`, 
                altNome: `FIANCO AGM ${prof}${spess}`,
                altCodice: `AGM${prof}${spess}PL`, 
                qta: 2 
              }
            ];

            let missingComponents = [];
            let updatedCount = 0;

            for (const comp of componenti) {
              const compArticle = articles.find(a => 
                a.codice === comp.altCodice || 
                a.nome === comp.nome || 
                (comp.altNome && a.nome === comp.altNome)
              );
              
              const compProcess = compArticle ? processes.find(p => p.articolo_id === compArticle.id) : null;
              
              if (!compArticle) {
                missingComponents.push(`${comp.altCodice}`);
              } else if (!compProcess) {
                missingComponents.push(`${comp.altCodice} (Senza processo)`);
              } else {
                // Use the movements API to handle the deduction and logging automatically
                await addMovementLog({
                  articolo_id: compArticle.id,
                  articolo_nome: compArticle.nome,
                  articolo_codice: compArticle.codice,
                  fase: 'piega',
                  tipo: 'SCARICO COMP. AGM',
                  quantita: deltaSaldatura * comp.qta,
                  note: `Scarico automatico per struttura ${article.codice}`,
                  timestamp: new Date().toISOString()
                });
                updatedCount++;
              }
            }
            
            if (missingComponents.length > 0) {
              toast.error(`Errore scarico: mancano ${missingComponents.join(', ')}`, { duration: 6000 });
            }
            if (updatedCount > 0) {
              toast.success(`${updatedCount} componenti scaricati automaticamente`);
            }
          }
        }
      }

      await updateArticle(id, {
        nome: article.nome,
        codice: article.codice,
        verniciati: formData.verniciati,
        impegni_clienti: formData.impegni_clienti,
        scorta: formData.scorta
      });

      if (process) {
        await updateProcess(process.id, {
          ...process,
          saldatura: type === 'strutture' ? formData.saldatura : process.saldatura,
          piega: type !== 'strutture' ? formData.saldatura : process.piega
        });
      }

      toast.success('Articolo aggiornato');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
      console.error(error);
    }
  };

  const insertAGM = async () => {
    const agmStrutture = [
      "AGM061204PR", "AGM061604PR", "AGM061804PR", "AGM061805PR", "AGM062004PR",
      "AGM062005PR", "AGM081204PR", "AGM081404PR", "AGM081604PR", "AGM081804PR",
      "AGM081805PR", "AGM082004PR", "AGM082005PR", "AGM101604PR", "AGM101605PR",
      "AGM101804PR", "AGM101805PR", "AGM102004PR", "AGM102005PR", "AGM120804PR",
      "AGM121004PR", "AGM121804PR", "AGM121805PR", "AGM122004PR", "AGM122005PR",
      "AGM140804PR", "AGM141004PR", "AGM141204PR", "AGM141205PR", "AGM160804PR",
      "AGM161004PR", "AGM161204PR", "AGM161205PR", "AGM162005PR", "AGM180804PR",
      "AGM181004PR", "AGM200804PR", "AGM201004PR", "AGM201204PR", "AGM201205PR"
    ];

    const agmFondiTetti = [
      "AGM-FO0604", "AGM-TT0604", "AGM-FO0605", "AGM-TT0605", "AGM-FO0804",
      "AGM-TT0804", "AGM-FO0805", "AGM-TT0805", "AGM-FO1004", "AGM-TT1004",
      "AGM-FO1005", "AGM-TT1005", "AGM-FO1204", "AGM-TT1204", "AGM-FO1205",
      "AGM-TT1205", "AGM-FO1404", "AGM-TT1404", "AGM-FO1405", "AGM-TT1405",
      "AGM-FO1604", "AGM-TT1604", "AGM-FO1605", "AGM-TT1605", "AGM-FO1804",
      "AGM-TT1804", "AGM-FO1805", "AGM-TT1805", "AGM-FO2004", "AGM-TT2004",
      "AGM-FO2005", "AGM-TT2005"
    ];

    const agmFianchi = [
      "AGM0604PL", "AGM0804PL", "AGM1004PL", "AGM1005PL", "AGM1204PL",
      "AGM1205PL", "AGM1404PL", "AGM1604PL", "AGM1605PL", "AGM1804PL",
      "AGM1805PL", "AGM2004PL", "AGM2005PL"
    ];

    let insertedCount = 0;
    
    // Inserisci Strutture
    for (const codice of agmStrutture) {
      const existingArticle = articles.find(a => a.codice === codice);
      if (!existingArticle) {
        await addArticle({ 
          nome: `STRUTTURA AGM ${codice}`, 
          codice,
          piega: 0,
          verniciati: 0,
          scorta: 0,
          impegni_clienti: 0
        });
        insertedCount++;
      } else if (existingArticle.nome.includes('AGR')) {
        await updateArticle(existingArticle.id, { ...existingArticle, nome: `STRUTTURA AGM ${codice}` });
        insertedCount++;
      }
    }

    // Inserisci Fondi e Tetti
    for (const codice of agmFondiTetti) {
      if (!articles.some(a => a.codice === codice)) {
        const tipo = codice.includes('FO') ? 'FONDO' : 'TETTO';
        await addArticle({ 
          nome: `${tipo} AGM ${codice.split('-')[1]}`, 
          codice,
          piega: 0,
          verniciati: 0,
          scorta: 0,
          impegni_clienti: 0
        });
        insertedCount++;
      }
    }

    // Inserisci Fianchi
    for (const codice of agmFianchi) {
      if (!articles.some(a => a.codice === codice)) {
        await addArticle({ 
          nome: `FIANCO AGM ${codice.replace('PL', '')}`, 
          codice,
          piega: 0,
          verniciati: 0,
          scorta: 0,
          impegni_clienti: 0
        });
        insertedCount++;
      }
    }

    onUpdate();
    toast.success(`${insertedCount} articoli inseriti`);
  };

  const renderRow = (article: Article, type: TableType = 'strutture') => {
    const process = processes.find(p => p.articolo_id === article.id);
    const saldati = process?.saldatura || 0;
    const piega = process?.piega || 0;
    const taglio = process?.taglio || 0;
    const verniciati = article.verniciati || 0;
    
    const verniciaturaCommitments = commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato' && c.fase_produzione === 'Verniciatura');
    const impegni = article.impegni_clienti || 0;
    
    const saldaturaCommitments = commitments.filter(c => String(c.articolo_id) === String(article.id) && c.stato_lavorazione !== 'Completato' && c.fase_produzione === 'Saldatura');
    const saldaturaImp = saldaturaCommitments.reduce((sum, c) => sum + c.quantita, 0);

    const scorta = article.scorta || 0;
    
    const tot = verniciati - impegni;
    const isEditing = editingId === article.id;
    
    return (
      <tr key={article.id} className="h-12 hover:bg-slate-50 transition-colors">
        <td className="border-b border-r border-slate-200 p-1 text-center">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-700">{article.nome || '-'}</span>
            <span className="text-[9px] text-slate-400 font-mono">{article.codice || '-'}</span>
          </div>
        </td>

        {type === 'strutture' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center relative">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura}
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <div 
                  className={clsx(
                    "font-mono text-[11px]", 
                    saldaturaCommitments.length > 0 ? "text-orange-600 cursor-pointer hover:underline font-bold" : ""
                  )}
                  onClick={() => {
                    if (saldaturaCommitments.length > 0) {
                      setActivePopupId(activePopupId === `${article.id}-saldatura` ? null : `${article.id}-saldatura`);
                    }
                  }}
                >
                  {saldati}
                </div>
              )}
              
              {activePopupId === `${article.id}-saldatura` && saldaturaCommitments.length > 0 && (
                <AGMPopup 
                  title="SALD" 
                  commitments={saldaturaCommitments} 
                  onClose={() => setActivePopupId(null)} 
                  popupRef={popupRef} 
                />
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.verniciati}
                  onChange={(e) => setFormData({ ...formData, verniciati: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{verniciati}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center relative">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.impegni_clienti}
                  onChange={(e) => setFormData({ ...formData, impegni_clienti: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <div 
                  className={clsx(
                    "font-mono text-xs font-bold", 
                    impegni > 0 ? "text-orange-600" : "text-amber-600"
                  )}
                >
                  {impegni > 0 ? impegni : ''}
                </div>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
            <td className={clsx(
              "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-bold",
              tot < 0 ? "text-white bg-red-500" : "text-blue-600"
            )}>
              {tot}
            </td>
          </>
        )}

        {type === 'fott' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {taglio}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura} // Using saldatura state for piega
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{piega}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
          </>
        )}

        {type === 'fianchi' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {taglio}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura} // Using saldatura state for piega
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{piega}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
          </>
        )}

        <td className="border-b border-slate-200 p-1 text-center">
          {isEditing ? (
            <div className="flex justify-center gap-1">
              <button onClick={() => handleSave(article.id, type)} className="text-green-600 hover:text-green-800">
                <Save className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => handleEdit(article, type)} className="text-blue-600 hover:text-blue-800">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Strutture AGM e Componenti</h1>
        </div>
        <button
          onClick={insertAGM}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          Inserisci AGM
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Table 1: Strutture AGM */}
        <div className="flex-[1.2] min-w-[400px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">STRUTTURE AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Articolo</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Saldati">SALD.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Verniciati">VER.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12 text-amber-600" title="Impegni Clienti">IMP.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Totale (Disponibilità)">TOT</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStrutture.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredStrutture.map(article => renderRow(article, 'strutture'))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Fondi e Tetti */}
        <div className="flex-1 min-w-[300px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">FONDI E TETTI AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Articolo</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Taglio">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Piega">PIEGA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFoTt.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredFoTt.map(article => renderRow(article, 'fott'))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Fianchi AGM */}
        <div className="flex-1 min-w-[300px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">FIANCHI AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Articolo</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Taglio">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Piega">PIEGA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFianchi.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredFianchi.map(article => renderRow(article, 'fianchi'))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

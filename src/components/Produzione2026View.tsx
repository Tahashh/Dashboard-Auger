import { useState, useEffect, useMemo, useRef } from 'react';
import { Article, Process, Commitment, Macchina5000, TaglioLaser, FaseTaglio } from '../types';
import { getDisponibilita, getCategory, isPhaseEnabled } from '../utils';
import { Package, Search, X, Filter, ChevronDown, Menu, Scissors, Flame, Play, Plus, Edit2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';
import { addMacchina5000, addFaseTaglio, addFaseSaldatura, addTaglioLaser, updateArticle, updateProcess } from '../api';
import { toast } from 'react-hot-toast';

interface Produzione2026ViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  macchina5000?: Macchina5000[];
  taglioLaser?: TaglioLaser[];
  faseTaglio?: FaseTaglio[];
  faseSaldatura?: FaseTaglio[];
  onUpdate: () => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  username?: string;
  role?: string;
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

const codiciValidi = [
  "AGR0304","AGR0305","AGR0306",
  "AGR0404","AGR0405","AGR0406","AGR0408","AGR0410",
  "AGR0604","AGR0605","AGR0606","AGR0608","AGR0610",
  "AGR0804","AGR0805","AGR0806","AGR0808","AGR0810",
  "AGR1004","AGR1005","AGR1006","AGR1008","AGR1010",
  "AGR1204","AGR1205","AGR1206","AGR1208","AGR1210","AGR1212",
  "AGR1404","AGR1405","AGR1406","AGR1408","AGR1410",
  "AGR1604","AGR1605","AGR1606","AGR1608","AGR1610",
  "AGR1804","AGR1805","AGR1806"
];

export default function Produzione2026View({ 
  articles, 
  processes, 
  commitments, 
  macchina5000 = [],
  taglioLaser = [],
  faseTaglio = [],
  faseSaldatura = [],
  onUpdate,
  categoryFilter,
  setCategoryFilter,
  username,
  role
}: Produzione2026ViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [commessaSearch, setCommessaSearch] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'positive' | 'negative' | 'zero'>('all');

  // Debounced values
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedCommessa, setDebouncedCommessa] = useState('');
  const [debouncedCliente, setDebouncedCliente] = useState('');
  const [frozenTooltipId, setFrozenTooltipId] = useState<string | null>(null);
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  const [selectedArticleForCut, setSelectedArticleForCut] = useState<Article | null>(null);
  const [cutForm, setCutForm] = useState({
    quantita: 0,
    odl: '',
    cliente: 'MAGAZZINO',
    commessa: 'PRODUZIONE 2026',
    macchina: 'Macchina 5000' as 'Macchina 5000' | 'Taglio Laser'
  });

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  const isAndrea = username === 'Andrea';
  const isOsvaldo = username === 'Osvaldo';
  const isRida = username === 'RidaTecnico';
  const isLucaTurati = username === 'LucaTurati';
  const isRobertoBonalumi = username === 'RobertoBonalumi';
  const isAdeleTurati = username === 'AdeleTurati';
  const isRestricted = isAndrea || isOsvaldo || isRida;
  const isDeveloper = username === 'TahaDev' || role === 'developer';
  const canAutoCut = isAndrea || isOsvaldo || isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;
  const canUseAutoCut = isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    codice: '',
    taglio: 0,
    piega: 0,
    saldatura: 0,
    verniciatura: 0
  });

  const startEditing = (article: Article) => {
    const process = getProcess(article.id);
    setEditingArticleId(article.id);
    setEditFormData({
      nome: article.nome,
      codice: article.codice,
      taglio: process.taglio || 0,
      piega: process.piega || 0,
      saldatura: process.saldatura || 0,
      verniciatura: article.verniciati || 0
    });
  };

  const saveEditing = async () => {
    if (!editingArticleId) return;
    try {
      // 1. Update article (name, code, verniciati)
      await updateArticle(editingArticleId, {
        nome: editFormData.nome,
        codice: editFormData.codice,
        verniciati: editFormData.verniciatura
      });

      // 2. Update process (taglio, piega, saldatura, verniciatura)
      const process = (processes || []).find(p => p.articolo_id === editingArticleId);
      if (process && process.id) {
        await updateProcess(process.id, {
          taglio: editFormData.taglio,
          piega: editFormData.piega,
          saldatura: editFormData.saldatura,
          verniciatura: editFormData.verniciatura
        });
      }

      toast.success('Dati aggiornati con successo');
      setEditingArticleId(null);
      onUpdate();
    } catch (error: any) {
      toast.error('Errore durante l\'aggiornamento: ' + error.message);
    }
  };

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContentWidth(entry.target.scrollWidth);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [articles, commitments, categoryFilter]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bottomScrollRef.current && bottomScrollRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current && topScrollRef.current.scrollLeft !== e.currentTarget.scrollLeft) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setDebouncedCommessa(commessaSearch);
      setDebouncedCliente(clienteSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, commessaSearch, clienteSearch]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setCommessaSearch('');
    setClienteSearch('');
    setCategoryFilter('Tutte');
    setAvailabilityFilter('all');
    setDebouncedSearch('');
    setDebouncedCommessa('');
    setDebouncedCliente('');
  };

  const handleAutoCut = async () => {
    if (!selectedArticleForCut) return;
    try {
      const cat = getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '');
      
      if (cat === 'Strutture Agr') {
        // Add to Fase Saldatura
        await addFaseSaldatura({
          lavorazione_per: cutForm.cliente,
          articolo: selectedArticleForCut.nome,
          quantita: cutForm.quantita,
          data: new Date().toISOString().split('T')[0],
          fatto: 0,
          stampato: 0,
          odl: cutForm.odl || null,
          commessa: cutForm.commessa || null,
          macchina: 'Reparto Saldatura'
        });
        toast.success(`Articolo ${selectedArticleForCut.nome} inviato al Reparto Saldatura`);
      } else {
        // Add to Fase Taglio (Marked as 'fatto: 0' so RidaTecnico can process it)
        await addFaseTaglio({
          lavorazione_per: cutForm.cliente,
          articolo: selectedArticleForCut.nome,
          quantita: cutForm.quantita,
          data: new Date().toISOString().split('T')[0],
          fatto: 0,
          stampato: 0,
          odl: cutForm.odl || null,
          commessa: cutForm.commessa || null,
          macchina: cutForm.macchina
        });
        toast.success(`Articolo ${selectedArticleForCut.nome} inviato a RidaTecnico per ${cutForm.macchina}`);
      }

      setIsCutModalOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Errore nell'invio: " + error.message);
    }
  };

  const openCutModal = (article: Article) => {
    const disp = getDisponibilita(article, commitments);
    const process = getProcess(article.id);
    
    // Calculate total pieces in pipeline
    const pipeline = (process.taglio || 0) + (process.piega || 0) + (process.saldatura || 0);
    
    // Suggested quantity is the absolute value of negative availability minus what's already in the pipeline
    const suggestedQty = disp < 0 ? Math.max(0, Math.abs(disp) - pipeline) : 0;

    setSelectedArticleForCut(article);
    setCutForm({
      quantita: suggestedQty,
      odl: '',
      cliente: 'MAGAZZINO',
      commessa: 'PRODUZIONE 2026',
      macchina: (isOsvaldo && !isAndrea && !isLucaTurati && !isRobertoBonalumi && !isDeveloper) ? 'Taglio Laser' : 'Macchina 5000'
    });
    setIsCutModalOpen(true);
  };

  // Helper to get process data for an article
  const getProcess = (articleId: string) => {
    return (processes || []).find(p => p.articolo_id === articleId) || { taglio: 0, piega: 0, saldatura: 0, verniciatura: 0 };
  };

  // Helper to get commitments for an article, optionally filtered by commessa and cliente
  const getArticleCommitments = (articleId: string, phase?: string) => {
    return (commitments || []).filter(c => {
      const matchesArticle = c.articolo_id === articleId;
      const matchesPhase = !phase || c.fase_produzione === phase;
      const matchesCommessa = !debouncedCommessa || (c.commessa || '').toLowerCase().includes(debouncedCommessa.toLowerCase());
      const matchesCliente = !debouncedCliente || (c.cliente || '').toLowerCase().includes(debouncedCliente.toLowerCase());
      const isNotCompleted = c.stato_lavorazione !== 'Completato';
      return matchesArticle && matchesPhase && matchesCommessa && matchesCliente && isNotCompleted;
    });
  };

  // Helper to get total commitments for an article (unfiltered by search, optionally filtered by phase)
  const getArticleTotalCommitments = (articleId: string, phase?: string) => {
    const tableSum = (commitments || []).filter(c => 
      String(c.articolo_id) === String(articleId) && 
      (!phase || c.fase_produzione === phase) && 
      c.stato_lavorazione !== 'Completato'
    ).reduce((sum, c) => sum + c.quantita, 0);

    // If no phase is specified, we are looking for the total commitments
    if (!phase) {
      const article = articles.find(a => String(a.id) === String(articleId));
      return Math.max(tableSum, article?.impegni_clienti || 0);
    }

    return tableSum;
  };

  // Helper to get filtered commitments for an article
  const getArticleFilteredCommitmentsCount = (articleId: string, phase?: string) => {
    return getArticleCommitments(articleId, phase).reduce((sum, c) => sum + c.quantita, 0);
  };

  // Helper to get simplified display name for articles
  const getDisplayName = (article: Article, category: string) => {
    if (isDeveloper) return article.nome;
    
    if (category === 'Porte IB/CB' || category === 'Porte Standard' || category === 'Porte PX/PV' || category === 'Porte INT/LAT/180°') {
      // Try to extract dimensions from name or code
      const nameMatch = article.nome.match(/(\d+)X(\d+)/i);
      const codeMatch = article.codice.match(/(\d{2})(\d{2})/);
      
      let dims = '';
      if (nameMatch) {
        dims = `${nameMatch[1]}x${nameMatch[2]}`;
      } else if (codeMatch) {
        dims = `${parseInt(codeMatch[1]) * 100}x${parseInt(codeMatch[2]) * 100}`;
      }

      const type = article.codice.endsWith('IB') ? 'IB' : 
                   article.codice.endsWith('CB') ? 'CB' : 
                   article.codice.endsWith('PX') ? 'PX' : 
                   article.codice.endsWith('PV') ? 'PV' : '';
      
      if (dims) return `${dims} ${type}`.trim();
    }
    return article.nome;
  };

  // Helper to render a phase cell with tooltip and alarm
  const renderPhaseCell = (count: number, phase: string, articleId: string, bgColor: string, category: string) => {
    const enabled = isPhaseEnabled(category, phase);
    
    if (!enabled) {
      return (
        <td className="px-3 py-1 text-center font-mono text-xs border border-slate-300 bg-slate-100/50 text-slate-300 cursor-not-allowed">
          -
        </td>
      );
    }

    const allPhaseCommitments = (commitments || []).filter(c => 
      c.articolo_id === articleId && 
      c.fase_produzione === phase &&
      c.stato_lavorazione !== 'Completato'
    );

    const phaseCommitments = allPhaseCommitments.filter(c => 
      (!debouncedCommessa || (c.commessa || '').toLowerCase().includes(debouncedCommessa.toLowerCase())) &&
      (!debouncedCliente || (c.cliente || '').toLowerCase().includes(debouncedCliente.toLowerCase()))
    );
    
    const hasCommitments = allPhaseCommitments.length > 0;
    const totalPhaseImp = allPhaseCommitments.reduce((sum, c) => sum + c.quantita, 0);
    const filteredPhaseImp = phaseCommitments.reduce((sum, c) => sum + c.quantita, 0);

    let cellBg = bgColor;
    let cellText = "text-slate-600";
    
    if (hasCommitments) {
      if (count >= totalPhaseImp) {
        cellBg = "bg-emerald-700";
        cellText = "text-white font-bold";
      } else {
        cellBg = "bg-orange-500";
        cellText = "text-white font-bold";
      }
    } else if (count < 0) {
      cellBg = "bg-red-500";
      cellText = "text-white font-bold";
    }

    const isFrozen = frozenTooltipId === `${articleId}-${phase}`;
    const isEditing = editingArticleId === articleId;

    if (isEditing) {
      const field = phase.toLowerCase() === 'verniciatura' ? 'verniciatura' : phase.toLowerCase();
      return (
        <td className="px-1 py-1 text-center border border-slate-300 bg-blue-50">
          <input 
            type="number" 
            className="w-full text-center font-mono text-[10px] border border-slate-300 rounded"
            value={(editFormData as any)[field]}
            onChange={e => setEditFormData({...editFormData, [field]: parseInt(e.target.value) || 0})}
          />
        </td>
      );
    }

    return (
      <td 
        onClick={() => {
          if (hasCommitments) {
            setFrozenTooltipId(isFrozen ? null : `${articleId}-${phase}`);
          }
        }}
        className={clsx(
        "px-3 py-1 text-center font-mono text-xs border border-slate-300 relative group cursor-help transition-all",
        cellBg,
        cellText,
        isFrozen && "ring-2 ring-inset ring-amber-400"
      )}>
        {count}
        {hasCommitments && (
          <div className={clsx(
            "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-64 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700 pointer-events-auto",
            isFrozen ? "block" : "hidden group-hover:block"
          )}>
            <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-white flex justify-between items-center">
              <div className="flex flex-col">
                <span>Impegni in fase {phase}:</span>
                {isFrozen && <span className="text-[8px] text-amber-400 animate-pulse">MODALITÀ BLOCCO ATTIVA</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-white">{totalPhaseImp} pz</span>
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
            <ul className="text-left space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {allPhaseCommitments.map(c => {
                const { additionalNote } = parseNote(c.note);
                return (
                  <li key={c.id} className={clsx(
                    "flex justify-between items-center border-b border-slate-800 pb-1.5 last:border-0",
                    (debouncedCommessa || debouncedCliente) && !phaseCommitments.includes(c) ? "opacity-30" : ""
                  )}>
                    <div className="flex flex-col truncate pr-2">
                      <span className="font-bold text-slate-100 truncate">{c.cliente}</span>
                      <span className="text-[9px] text-slate-400">
                        Commessa: {c.commessa}
                        {additionalNote && <span className="text-emerald-400 ml-1 font-bold">N.B: {additionalNote}</span>}
                      </span>
                    </div>
                    <span className="font-bold text-white whitespace-nowrap ml-2">{c.quantita} pz</span>
                  </li>
                );
              })}
            </ul>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
          </div>
        )}
      </td>
    );
  };

  const FAMILIES = [
    'Porte', 'Retri', 'Laterali', 'Tetti', 'Piastre', 'Basi&Tetti', 
    'AGS', 'AGC', 'AGLM', 'AGLC', 'Cristalli', 'Strutture Agr'
  ];

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = (a.nome || '').toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            (a.codice || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      
      let matchesCategory = false;
      const cat = getCategory(a.nome || '', a.codice || '');
      
      if (['PORTE AT', 'PIASTRE AT', 'INVOLUCRI AT'].includes(cat)) {
        return false;
      }
      
      // Exclude AGR components from Produzione 2026, only show valid master codes
      if (cat === 'Strutture Agr' && !codiciValidi.includes(a.codice || '')) {
        return false;
      }

      if (categoryFilter === 'Tutte') {
        matchesCategory = true;
      } else if (categoryFilter === 'Strutture Agr') {
        matchesCategory = cat === 'Strutture Agr';
      } else if (categoryFilter === 'Porte') {
        matchesCategory = cat.startsWith('Porte');
      } else if (categoryFilter === 'Retri') {
        matchesCategory = ['Retri', 'Montanti Centrali Retro'].includes(cat);
      } else if (categoryFilter === 'Laterali') {
        matchesCategory = ['Laterali', 'Laterali Ibridi'].includes(cat);
      } else if (categoryFilter === 'Piastre') {
        matchesCategory = ['Piastre Frontali', 'Piastre Laterali'].includes(cat);
      } else {
        matchesCategory = cat === categoryFilter;
      }
      
      // If commessa or cliente search is active, the article must have matching commitments
      const articleCommitments = commitments.filter(c => c.articolo_id === a.id && c.stato_lavorazione !== 'Completato');
      
      const matchesCommessa = !debouncedCommessa || articleCommitments.some(c => 
        (c.commessa || '').toLowerCase().includes(debouncedCommessa.toLowerCase())
      );
      
      const matchesCliente = !debouncedCliente || articleCommitments.some(c => 
        (c.cliente || '').toLowerCase().includes(debouncedCliente.toLowerCase())
      );

      const disp = getDisponibilita(a, commitments);
      let matchesAvailability = true;
      if (availabilityFilter === 'positive') matchesAvailability = disp > 0;
      else if (availabilityFilter === 'negative') matchesAvailability = disp < 0;
      else if (availabilityFilter === 'zero') matchesAvailability = disp === 0;

      return matchesSearch && matchesCategory && matchesCommessa && matchesCliente && matchesAvailability;
    }).sort((a, b) => {
      // Special sorting for Strutture Agr to group by size then BASE/TETTO
      const catA = getCategory(a.nome || '', a.codice || '');
      const catB = getCategory(b.nome || '', b.codice || '');
      
      if (catA === 'Strutture Agr' && catB === 'Strutture Agr') {
        const getNumericPart = (code: string) => {
          const match = code.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const numA = getNumericPart(a.codice || '');
        const numB = getNumericPart(b.codice || '');
        
        if (numA !== numB) return numA - numB;
        // If same size, BASE (STB) comes before TETTO (STT)
        return (a.codice || '').localeCompare(b.codice || '');
      }

      // Primary sort by code (which represents size for plates and many other items)
      return (a.codice || '').localeCompare(b.codice || '');
    });
  }, [articles, commitments, debouncedSearch, debouncedCommessa, debouncedCliente, categoryFilter, availabilityFilter]);

  // Statistics for the filtered view
  const stats = useMemo(() => {
    if (!debouncedCliente && !debouncedCommessa) return null;
    
    const matchingCommitments = (commitments || []).filter(c => {
      const article = (articles || []).find(a => a.id === c.articolo_id);
      const isPiastra = (article?.nome || '').toUpperCase().includes('PIASTRA');
      const expectedPhase = isPiastra ? 'Piega' : 'Verniciatura';
      
      const matchesPhase = c.fase_produzione === expectedPhase;
      const matchesCommessa = !debouncedCommessa || (c.commessa || '').toLowerCase().includes(debouncedCommessa.toLowerCase());
      const matchesCliente = !debouncedCliente || (c.cliente || '').toLowerCase().includes(debouncedCliente.toLowerCase());
      const isNotCompleted = c.stato_lavorazione !== 'Completato';
      return matchesPhase && matchesCommessa && matchesCliente && isNotCompleted;
    });

    const uniqueCommesse = new Set(matchingCommitments.map(c => c.commessa)).size;
    const totalArticoli = matchingCommitments.reduce((sum, c) => sum + c.quantita, 0);

    return {
      commesse: uniqueCommesse,
      articoli: totalArticoli
    };
  }, [commitments, debouncedCommessa, debouncedCliente, articles]);

  const columns = [
    ['Porte Standard', 'Porte PX/PV'],
    ['Porte IB/CB', 'Porte INT/LAT/180°'],
    ['Retri', 'Montanti Centrali Retro'],
    ['Laterali', 'Laterali Ibridi'],
    ['Tetti'],
    ['Piastre Frontali', 'Piastre Laterali'],
    ['Basi&Tetti'],
    ['Strutture Agr'],
    ['AGS'],
    ['AGC'],
    ['AGLM'],
    ['AGLC'],
    ['Cristalli']
  ];

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md pt-8 pb-4 -mt-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 shadow-sm border-b border-slate-200/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Produzione 2026</h2>
            <p className="text-sm text-slate-500">Tabella generale di produzione con dettagli impegni</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[180px]">
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

          <div className="relative flex-1 min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cerca commessa..."
              value={commessaSearch}
              onChange={(e) => setCommessaSearch(e.target.value)}
              className="pl-10 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Cerca cliente..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="pl-10 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
              className="pl-10 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none appearance-none bg-white"
            >
              <option value="all">Tutte le disponibilità</option>
              <option value="positive">Disponibilità Positiva (Verde)</option>
              <option value="negative">Disponibilità Negativa (Rossa)</option>
              <option value="zero">Disponibilità Zero (Neutra)</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {(searchTerm || commessaSearch || clienteSearch || categoryFilter !== 'Tutte' || availabilityFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Reset filtri"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="flex gap-4 mb-2 mt-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2 flex items-center gap-3">
            <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Commesse:</div>
            <div className="text-lg font-bold text-indigo-900">{stats.commesse}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 flex items-center gap-3">
            <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Articoli Totali:</div>
            <div className="text-lg font-bold text-emerald-900">{stats.articoli}</div>
          </div>
        </div>
      )}

      {/* Top Scrollbar for better visibility */}
      <div className="flex flex-col gap-1 mt-4">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider px-1">Scorri le categorie a destra e sinistra</span>
        <div 
          ref={topScrollRef}
          className="overflow-x-auto custom-scrollbar bg-slate-100 rounded-lg border border-slate-200 shadow-inner"
          onScroll={handleTopScroll}
        >
          <div style={{ width: contentWidth > 0 ? contentWidth : '100%', height: '1px' }}></div>
        </div>
      </div>
    </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div 
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="flex-1 overflow-x-auto overflow-y-auto pb-4 custom-scrollbar"
        >
          <div ref={contentRef} className="flex gap-6 h-full items-start px-1 w-max">
            {columns.map((col, colIdx) => {
              // Filter categories in this column that should be visible
              const visibleCategories = col.filter(category => {
                if (categoryFilter !== 'Tutte') {
                  if (categoryFilter === 'Porte') {
                    return category.startsWith('Porte');
                  }
                  if (categoryFilter === 'Retri') {
                    return ['Retri', 'Montanti Centrali Retro'].includes(category);
                  }
                  if (categoryFilter === 'Laterali') {
                    return ['Laterali', 'Laterali Ibridi'].includes(category);
                  }
                  if (categoryFilter === 'Piastre') {
                    return ['Piastre Frontali', 'Piastre Laterali'].includes(category);
                  }
                  return category === categoryFilter;
                }
                
                const categoryArticles = filteredArticles.filter(a => getCategory(a.nome || '', a.codice || '') === category);
                const forceShowCategories = [
                  'Porte Standard', 'Porte IB/CB', 'Porte PX/PV', 'Porte INT/LAT/180°', 
                  'Retri', 'Montanti Centrali Retro',
                  'Laterali', 'Laterali Ibridi', 
                  'Tetti', 
                  'Piastre Frontali', 'Piastre Laterali',
                  'Strutture Agr'
                ];
                return categoryArticles.length > 0 || forceShowCategories.includes(category);
              });

              if (visibleCategories.length === 0) return null;

              return (
                <div key={colIdx} className="flex flex-col gap-6 min-w-[650px] w-[650px] flex-shrink-0">
                  {visibleCategories.map(category => {
                    const categoryArticles = filteredArticles.filter(a => getCategory(a.nome || '', a.codice || '') === category);
                    
                    return (
                      <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        {/* Header Blocco */}
                        <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center rounded-t-xl shrink-0">
                          <h3 className="font-bold uppercase tracking-wider text-sm">{category}</h3>
                          <span className="text-[10px] font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                            {categoryArticles.length} {categoryArticles.length === 1 ? 'articolo' : 'articoli'}
                          </span>
                        </div>
                        
                        {/* Tabella Scrollabile */}
                  <div className="flex-1">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 font-semibold border-b border-slate-300 border-r">Articolo</th>
                          {isDeveloper && (
                            <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-16">Azioni</th>
                          )}
                          {canAutoCut && (
                            <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-10" title="Auto Cut">Auto</th>
                          )}
                          {isPhaseEnabled(category, 'Taglio') && (
                            <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-12" title="Taglio">Tag.</th>
                          )}
                          {!isRestricted && (
                            <>
                              {isPhaseEnabled(category, 'Piega') && (
                                <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-12" title="Piega (Grezzo)">Gre.</th>
                              )}
                              {isPhaseEnabled(category, 'Saldatura') && (
                                <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-12" title="Saldatura">Sald.</th>
                              )}
                              <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-12" title="Verniciatura">Ver.</th>
                              <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-12" title="Impegni">Imp.</th>
                              <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 border-r w-14" title="Totale (Disponibilità)">Tot</th>
                              <th className="px-2 py-2 font-semibold text-center border-b border-slate-300 w-12" title="Scorta">Sco.</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {categoryArticles.length === 0 && (
                          <tr>
                            <td colSpan={2 + (isDeveloper ? 1 : 0) + (canAutoCut ? 1 : 0) + (!isRestricted ? 5 : 0) + (!isRestricted && isPhaseEnabled(category, 'Saldatura') ? 1 : 0)} className="px-3 py-8 text-center text-slate-500 italic">
                              Nessun articolo presente. In attesa di inserimento misure.
                            </td>
                          </tr>
                        )}
                        {categoryArticles.map(article => {
                          const process = getProcess(article.id);
                          const isPiastra = (article.nome || '').toUpperCase().includes('PIASTRA');
                          const articleCommitments = commitments.filter(c => c.articolo_id === article.id && c.stato_lavorazione !== 'Completato');
                          const disp = getDisponibilita(article, commitments);
                          
                          const filteredImpCount = getArticleFilteredCommitmentsCount(article.id);
                          const totalImpCount = getArticleTotalCommitments(article.id);
                          const isFiltered = debouncedCommessa || debouncedCliente;
                          
                          // Calculate commitments for each phase
                          const tagImp = getArticleTotalCommitments(article.id, 'Taglio');
                          const greImp = getArticleTotalCommitments(article.id, 'Piega');
                          const saldImp = getArticleTotalCommitments(article.id, 'Saldatura');
                          const verImp = getArticleTotalCommitments(article.id, 'Verniciatura');

                          const hasCommitments = tagImp > 0 || greImp > 0 || saldImp > 0 || verImp > 0;
                          
                          let articleNameClass = "text-slate-800";
                          if (hasCommitments) {
                            const isWarning = 
                              (tagImp > 0 && process.taglio < tagImp) ||
                              (greImp > 0 && process.piega < greImp) ||
                              (saldImp > 0 && process.saldatura < saldImp) ||
                              (verImp > 0 && article.verniciati < verImp);
                            
                            if (isWarning) {
                              articleNameClass = "text-orange-500 font-bold";
                            } else {
                              articleNameClass = "text-blue-800 font-bold";
                            }
                          }

                          let availabilityColorClass = "text-slate-700 font-medium";
                          if (disp < 0) {
                            availabilityColorClass = "text-white font-bold bg-red-500";
                          }

                          const tooltipContent = articleCommitments.length > 0 && (() => {
                            const grouped = articleCommitments.reduce((acc, c) => {
                              const { month } = parseNote(c.note);
                              if (!acc[month]) acc[month] = [];
                              acc[month].push(c);
                              return acc;
                            }, {} as Record<string, typeof articleCommitments>);

                            const sortedMonths = Object.keys(grouped).sort((a, b) => {
                              const indexA = mesi.indexOf(a);
                              const indexB = mesi.indexOf(b);
                              if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                              if (indexA === -1) return 1;
                              if (indexB === -1) return -1;
                              return indexA - indexB;
                            });

                            const isFrozen = frozenTooltipId === `${article.id}-imp`;

                            return (
                              <div className={clsx(
                                "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 w-72 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl p-3 border border-slate-700 pointer-events-auto",
                                isFrozen ? "block" : "hidden group-hover:block"
                              )}>
                                <div className="font-bold border-b border-slate-700 pb-2 mb-2 text-emerald-400 flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span>{isFiltered ? 'Impegni Filtrati:' : 'Dettaglio Impegni Attivi:'}</span>
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
                                <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                                  {sortedMonths.map(month => (
                                    <div key={month} className="space-y-1">
                                      <div className="text-amber-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1 flex justify-between items-center">
                                        <span>{month}</span>
                                        <span className="text-[8px] font-normal text-slate-500">
                                          {grouped[month].reduce((sum, c) => sum + c.quantita, 0)} pz
                                        </span>
                                      </div>
                                      <ul className="text-left space-y-1.5">
                                        {grouped[month].map(c => {
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
                                  <span>{isFiltered ? 'Totale Filtrato:' : 'Totale Impegni:'}</span>
                                  <span className="text-amber-400">{isFiltered ? filteredImpCount : totalImpCount} pz</span>
                                </div>
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
                              </div>
                            );
                          })();

                          const isEditing = editingArticleId === article.id;

                          return (
                            <tr key={article.id} className={clsx("hover:bg-slate-50 transition-colors h-10 group/row", isEditing && "bg-blue-50")}>
                              <td className={clsx("px-3 py-1 border-r border-slate-200", articleNameClass)}>
                                {isEditing ? (
                                  <div className="flex flex-col gap-1">
                                    <input 
                                      type="text" 
                                      className="text-[10px] border border-slate-300 rounded px-1 py-0.5 w-full"
                                      value={editFormData.nome}
                                      onChange={e => setEditFormData({...editFormData, nome: e.target.value})}
                                    />
                                    <input 
                                      type="text" 
                                      className="text-[9px] border border-slate-300 rounded px-1 py-0.5 w-full font-mono"
                                      value={editFormData.codice}
                                      onChange={e => setEditFormData({...editFormData, codice: e.target.value})}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold">{getDisplayName(article, category)}</span>
                                    <span className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{article.codice}</span>
                                  </div>
                                )}
                              </td>
                              {isDeveloper && (
                                <td className="px-1 py-1 border-r border-slate-200 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isEditing ? (
                                      <>
                                        <button onClick={saveEditing} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Salva">
                                          <CheckCircle className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setEditingArticleId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Annulla">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <button onClick={() => startEditing(article)} className="p-1 text-slate-400 hover:text-blue-600 opacity-0 group-hover/row:opacity-100 transition-opacity" title="Modifica">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )}
                              {canAutoCut && (
                                <td className="px-1 py-1 border-r border-slate-200 text-center">
                                  {(() => {
                                    const activeTask = macchina5000.find(m => m.articolo === article.nome && m.stato !== 'completato') || 
                                                       taglioLaser.find(m => m.articolo === article.nome && m.stato !== 'completato');
                                    const taskStatus = activeTask?.stato;
                                    
                                    // Check for request in fase_taglio or fase_saldatura
                                    const pendingRequest = category === 'Strutture Agr' 
                                      ? faseSaldatura.find(f => f.articolo === article.nome && f.fatto === 0)
                                      : faseTaglio.find(f => f.articolo === article.nome && f.fatto === 0);
                                    const isRequestSent = !!pendingRequest;
                                    
                                    const pipeline = (process.taglio || 0) + (process.piega || 0) + (process.saldatura || 0);
                                    const totalAvailable = (article.verniciati || 0) + pipeline;
                                    const isSatisfied = totalAvailable >= totalImpCount;
                                    
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
                                        const machineName = macchina5000.find(m => m.articolo === article.nome && m.stato === 'da tagliare') ? 'Macchina 5000' : 'Taglio Laser';
                                        buttonClass = "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300";
                                        tooltip = `programma inviato ${machineName}`;
                                      } else if (isRequestSent) {
                                        buttonClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300";
                                        tooltip = "richiesta inviata all'ufficio programmazione";
                                      } else {
                                        if (process.taglio > 0) {
                                          buttonClass = "bg-transparent text-slate-900 hover:bg-slate-100";
                                          tooltip = "Carico di taglio effettuato";
                                        } else if (isSatisfied) {
                                          buttonClass = "bg-transparent text-slate-300/30 hover:bg-slate-100 hover:text-slate-400";
                                          tooltip = "Impegno soddisfatto";
                                        } else {
                                          buttonClass = "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200";
                                          tooltip = category === 'Strutture Agr' ? "Invia al Reparto Saldatura" : "Invia alla Macchina 5000/Taglio Laser";
                                        }
                                      }
                                    } else {
                                      // Default behavior for other users (Andrea, Osvaldo)
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
                                        tooltip = !canUseAutoCut ? "Non hai i permessi per utilizzare questa funzione" : (taskStatus ? `Stato Macchina: ${taskStatus}` : (category === 'Strutture Agr' ? "Invia al Reparto Saldatura" : "Invia alla Macchina 5000/Taglio Laser"));
                                      }
                                    }

                                    return (
                                      <button
                                        onClick={() => canUseAutoCut && openCutModal(article)}
                                        disabled={!canUseAutoCut}
                                        className={clsx(
                                          "p-1.5 rounded-lg transition-all shadow-sm",
                                          canUseAutoCut ? "hover:scale-110 active:scale-95 cursor-pointer" : "opacity-50 cursor-not-allowed",
                                          buttonClass
                                        )}
                                        title={tooltip}
                                      >
                                        {category === 'Strutture Agr' ? <Flame className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
                                      </button>
                                    );
                                  })()}
                                </td>
                              )}
                              {isPhaseEnabled(category, 'Taglio') && renderPhaseCell(process.taglio, 'Taglio', article.id, 'bg-emerald-50/30 border-r border-slate-200', category)}
                              {!isRestricted && (
                                <>
                                  {isPhaseEnabled(category, 'Piega') && renderPhaseCell(process.piega, 'Piega', article.id, 'bg-slate-50 border-r border-slate-200', category)}
                                  {isPhaseEnabled(category, 'Saldatura') && renderPhaseCell(process.saldatura, 'Saldatura', article.id, 'bg-blue-50/30 border-r border-slate-200', category)}
                                  {renderPhaseCell(article.verniciati, 'Verniciatura', article.id, 'bg-purple-50/30 border-r border-slate-200', category)}
                                  <td 
                                    onClick={() => {
                                      if ((isFiltered ? filteredImpCount : totalImpCount) > 0) {
                                        setFrozenTooltipId(frozenTooltipId === `${article.id}-imp` ? null : `${article.id}-imp`);
                                      }
                                    }}
                                    className={clsx(
                                    "px-2 py-1 text-center font-mono text-xs border-r border-slate-200 relative group cursor-help transition-all",
                                    ((isFiltered ? filteredImpCount : totalImpCount) > 0 ? "bg-orange-50 text-orange-700 font-bold hover:bg-orange-100" : "text-slate-400"),
                                    frozenTooltipId === `${article.id}-imp` && "ring-2 ring-inset ring-amber-400 bg-amber-50"
                                  )}>
                                    {isFiltered ? (
                                      <div className="flex flex-col items-center leading-tight">
                                        <span>{filteredImpCount}</span>
                                        <span className="text-[8px] opacity-50 font-normal">/{totalImpCount}</span>
                                      </div>
                                    ) : (
                                      totalImpCount
                                    )}
                                    {tooltipContent}
                                  </td>
                                  <td className={clsx("px-2 py-1 text-center font-mono text-sm border-r border-slate-200", availabilityColorClass)}>
                                    {disp}
                                  </td>
                                  <td className="px-2 py-1 text-center font-mono text-xs text-slate-500 bg-yellow-50/30">
                                    {article.scorta || 0}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      
      {filteredArticles.length === 0 && (
              <div className="w-full flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <div className="text-slate-400 flex flex-col items-center gap-2">
                  <Search className="h-8 w-8 opacity-50" />
                  <p>Nessun articolo trovato con i filtri correnti</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal for Auto Cut */}
      {isCutModalOpen && selectedArticleForCut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className={clsx("p-2 rounded-lg", getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? "bg-red-500" : "bg-amber-500")}>
                  {getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? <Flame className="w-5 h-5 text-white" /> : <Scissors className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-white font-bold">{getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? 'Invia al Reparto Saldatura' : 'Invia alla Macchina 5000/Taglio Laser'}</h3>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Automazione Produzione 2026</p>
                </div>
              </div>
              <button onClick={() => setIsCutModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Articolo Selezionato</div>
                <div className="font-bold text-slate-800">{selectedArticleForCut.nome}</div>
                <div className="text-xs text-slate-500 font-mono">{selectedArticleForCut.codice}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase">{getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? 'Quantità da Saldare' : 'Quantità da Tagliare'}</label>
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

              {getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') !== 'Strutture Agr' && (
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
              )}
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
                className={clsx("flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20")}
              >
                <Play className="w-4 h-4 fill-current" />
                {getCategory(selectedArticleForCut.nome || '', selectedArticleForCut.codice || '') === 'Strutture Agr' ? 'CONFERMA INVIO' : 'CONFERMA TAGLIO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Article, Process, Commitment, Macchina5000, TaglioLaser, FaseTaglio } from '../types';
import { getDisponibilita, getCategory, isPhaseEnabled } from '../utils';
import { Package, Search, X, Filter, ChevronDown, Menu, Scissors, Play, Plus, Edit2, CheckCircle, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';
import { addMacchina5000, addFaseTaglio, addTaglioLaser, updateArticle, updateProcess } from '../api';
import { toast } from 'react-hot-toast';

interface MagazzinoAGRViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  macchina5000?: Macchina5000[];
  taglioLaser?: TaglioLaser[];
  faseTaglio?: FaseTaglio[];
  onUpdate: () => void;
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

export default function MagazzinoAGRView({ 
  articles, 
  processes, 
  commitments, 
  macchina5000 = [],
  taglioLaser = [],
  faseTaglio = [],
  onUpdate,
  username,
  role
}: MagazzinoAGRViewProps) {
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
    commessa: 'MAGAZZINO AGR',
    macchina: 'Macchina 5000' as 'Macchina 5000' | 'Taglio Laser'
  });

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  const isLucaTurati = username === 'LucaTurati';
  const isRobertoBonalumi = username === 'RobertoBonalumi';
  const isAdeleTurati = username === 'AdeleTurati';
  const isDeveloper = username === 'TahaDev' || role === 'developer';
  const canAutoCut = isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;
  const canUseAutoCut = isLucaTurati || isRobertoBonalumi || isAdeleTurati || isDeveloper;

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [movementForm, setMovementForm] = useState({
    articolo_id: '',
    fase: 'saldatura' as 'saldatura' | 'verniciatura',
    tipo: 'carico' as 'carico' | 'scarico',
    quantita: 0
  });
  const [agrRequirements, setAgrRequirements] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/agr_requirements')
      .then(res => res.json())
      .then(data => setAgrRequirements(data))
      .catch(err => console.error('Error fetching AGR requirements:', err));
  }, []);

  const handleRegisterMovement = async () => {
    if (!movementForm.articolo_id || movementForm.quantita <= 0) {
      toast.error('Seleziona un articolo e inserisci una quantità valida');
      return;
    }

    try {
      const qtyToSend = Math.floor(movementForm.quantita / 2);

      if (qtyToSend <= 0) {
        toast.error('La quantità deve essere almeno 2 per formare una struttura completa');
        return;
      }

      const response = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolo_id: movementForm.articolo_id,
          fase: movementForm.fase,
          tipo: movementForm.tipo,
          quantita: qtyToSend,
          operatore: username
        })
      });

      if (response.ok) {
        toast.success('Movimento registrato con successo');
        setMovementForm({ ...movementForm, quantita: 0 });
        onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Errore durante la registrazione');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    }
  };
  const [editFormData, setEditFormData] = useState({
    nome: '',
    codice: '',
    taglio: 0,
    piega: 0,
    saldatura: 0,
    verniciatura: 0
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setDebouncedCommessa(commessaSearch);
      setDebouncedCliente(clienteSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, commessaSearch, clienteSearch]);

  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current) {
        setContentWidth(contentRef.current.scrollWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [articles, processes, commitments]);

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderImpCell = (a: Article) => {
    const isFrozen = frozenTooltipId === `${a.id}-imp`;
    const articleCommitments = commitments.filter(c => String(c.articolo_id) === String(a.id) && c.stato_lavorazione !== 'Completato');
    const tableImp = articleCommitments.reduce((sum, c) => sum + c.quantita, 0);
    const totalImpCount = Math.max(tableImp, a.impegni_clienti || 0);

    const tooltipContent = totalImpCount > 0 && (
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white p-3 rounded-xl shadow-2xl z-50 border border-slate-700 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2 border-b border-slate-700 pb-1">
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Dettaglio Impegni</span>
          <span className="text-[10px] font-black text-white bg-blue-600 px-1.5 py-0.5 rounded-md">{totalImpCount} TOT</span>
        </div>
        {articleCommitments.length > 0 ? (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {articleCommitments.map((c, idx) => {
              const { month, additionalNote } = parseNote(c.note);
              return (
                <li key={idx} className="text-[10px] flex items-center justify-between gap-2 py-1 border-b border-slate-800/50 last:border-0 group">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-200 truncate group-hover:text-blue-300 transition-colors">
                      {c.commessa || 'N/D'} - {c.cliente || 'N/D'}
                    </span>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <span className={clsx(
                        "px-1 rounded-[2px] font-black",
                        month === 'ALTRO' ? "bg-slate-700 text-slate-300" : "bg-emerald-900/50 text-emerald-400"
                      )}>
                        {month}
                      </span>
                      {additionalNote && <span className="text-emerald-400 ml-1 font-bold">N.B: {additionalNote}</span>}
                    </span>
                  </div>
                  <span className="font-bold text-white whitespace-nowrap ml-2">{c.quantita} pz</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-[10px] text-slate-400 italic py-2 text-center">
            Impegni manuali: {a.impegni_clienti || 0}
          </div>
        )}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-700"></div>
      </div>
    );

    return (
      <td 
        className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-slate-600 relative group"
        onMouseEnter={() => !frozenTooltipId && setFrozenTooltipId(`${a.id}-imp`)}
        onMouseLeave={() => !isFrozen && setFrozenTooltipId(null)}
        onClick={() => setFrozenTooltipId(isFrozen ? null : `${a.id}-imp`)}
      >
        <span className={clsx(
          "cursor-help transition-all",
          totalImpCount > 0 ? "font-bold text-blue-600 underline decoration-dotted underline-offset-2" : ""
        )}>
          {totalImpCount}
        </span>
        {frozenTooltipId === `${a.id}-imp` && tooltipContent}
      </td>
    );
  };

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = (a.nome || '').toLowerCase().includes(debouncedSearch.toLowerCase()) || 
                            (a.codice || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const cat = getCategory(a.nome || '', a.codice || '');
      const matchesCategory = cat === 'Strutture Agr' && codiciValidi.includes(a.codice || '');
      
      if (!matchesCategory) return false;

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

      return matchesSearch && matchesCommessa && matchesCliente && matchesAvailability;
    }).sort((a, b) => {
      // Special sorting for Strutture Agr to group by size then BASE/TETTO
      const getNumericPart = (code: string) => {
        const match = code.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      const numA = getNumericPart(a.codice || '');
      const numB = getNumericPart(b.codice || '');
      
      if (numA !== numB) return numA - numB;
      // If same size, BASE (STB) comes before TETTO (STT)
      return (a.codice || '').localeCompare(b.codice || '');
    });
  }, [articles, debouncedSearch, debouncedCommessa, debouncedCliente, availabilityFilter, commitments]);

  const handleEditClick = (a: Article, p: Process | undefined) => {
    setEditingArticleId(a.id);
    setEditFormData({
      nome: a.nome || '',
      codice: a.codice || '',
      taglio: p?.taglio || 0,
      piega: p?.piega || 0,
      saldatura: p?.saldatura || 0,
      verniciatura: p?.verniciatura || 0
    });
  };

  const handleSaveEdit = async () => {
    if (!editingArticleId) return;
    try {
      await updateArticle(editingArticleId, {
        nome: editFormData.nome,
        codice: editFormData.codice,
        verniciati: editFormData.verniciatura,
        piega: editFormData.piega
      });
      const process = processes.find(p => p.articolo_id === editingArticleId);
      if (process && process.id) {
        await updateProcess(process.id, {
          taglio: editFormData.taglio,
          piega: editFormData.piega,
          saldatura: editFormData.saldatura,
          verniciatura: editFormData.verniciatura
        });
      }
      toast.success('Articolo aggiornato con successo');
      setEditingArticleId(null);
      onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleAutoCut = (a: Article) => {
    const disp = getDisponibilita(a, commitments);
    const p = processes.find(proc => proc.articolo_id === a.id) || { taglio: 0, piega: 0, saldatura: 0, verniciatura: 0 };
    
    // Calculate total pieces in pipeline
    const pipeline = (p.taglio || 0) + (p.piega || 0) + (p.saldatura || 0);
    
    // Suggested quantity is the absolute value of negative availability minus what's already in the pipeline
    const suggestedQty = disp < 0 ? Math.max(0, Math.abs(disp) - pipeline) : 0;

    setSelectedArticleForCut(a);
    setCutForm({
      quantita: suggestedQty || 1,
      odl: '',
      cliente: 'MAGAZZINO',
      commessa: 'MAGAZZINO AGR',
      macchina: 'Macchina 5000'
    });
    setIsCutModalOpen(true);
  };

  const submitAutoCut = async () => {
    if (!selectedArticleForCut) return;
    try {
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
      setIsCutModalOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Errore nell'invio: " + error.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with Title and Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-2 rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">MAGAZZINO AGR</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Gestione Strutture AGR</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Totale: {filteredArticles.length} articoli</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cerca per nome o codice..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cerca per commessa..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={commessaSearch}
              onChange={(e) => setCommessaSearch(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cerca per cliente..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              className="bg-transparent text-sm focus:outline-none w-full font-medium text-slate-700"
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as any)}
            >
              <option value="all">Tutte le disponibilità</option>
              <option value="positive">Disponibilità &gt; 0</option>
              <option value="negative">Disponibilità &lt; 0</option>
              <option value="zero">Disponibilità = 0</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registra Movimento Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-2 h-6 bg-blue-600 rounded-full" />
          REGISTRA MOVIMENTO AGR
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">SELEZIONE ARTICOLO</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={movementForm.articolo_id}
              onChange={(e) => setMovementForm({ ...movementForm, articolo_id: e.target.value })}
            >
              <option value="">Seleziona Articolo...</option>
              {articles
                .filter(a => codiciValidi.includes(a.codice || ''))
                .sort((a, b) => (a.codice || '').localeCompare(b.codice || ''))
                .map(a => (
                <option key={a.id} value={a.id}>{a.codice} - {a.nome}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Fase</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={movementForm.fase}
              onChange={(e) => setMovementForm({ ...movementForm, fase: e.target.value as 'saldatura' | 'verniciatura' })}
            >
              <option value="saldatura">SALD.</option>
              <option value="verniciatura">VER.</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Movimento</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={movementForm.tipo}
              onChange={(e) => setMovementForm({ ...movementForm, tipo: e.target.value as 'carico' | 'scarico' })}
            >
              <option value="carico">CARICO</option>
              <option value="scarico">SCARICO</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Quantità</label>
            <input 
              type="number"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={movementForm.quantita || ''}
              onChange={(e) => setMovementForm({ ...movementForm, quantita: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <button 
            onClick={handleRegisterMovement}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-8 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            REGISTRA
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Scrollbar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto border-b border-slate-100 bg-slate-50/50"
          onScroll={handleTopScroll}
        >
          <div style={{ width: contentWidth, height: '1px' }}></div>
        </div>

        <div 
          ref={bottomScrollRef}
          className="overflow-x-auto overflow-y-auto custom-scrollbar"
          style={{ maxHeight: 'calc(100vh - 350px)' }}
          onScroll={handleBottomScroll}
        >
          <div ref={contentRef} className="inline-block min-w-full align-middle">
            <table className="min-w-full border-collapse table-fixed">
              <thead className="sticky top-0 z-30">
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <th className="w-10 border-r border-slate-700 p-2 text-center sticky left-0 z-40 bg-slate-900">#</th>
                  <th className="w-48 border-r border-slate-700 p-2 text-left sticky left-10 z-40 bg-slate-900">Articolo</th>
                  <th className="w-32 border-r border-slate-700 p-2 text-left">Codice</th>
                  <th className="w-16 border-r border-slate-700 p-2 text-center bg-slate-800">SALD.</th>
                  <th className="w-16 border-r border-slate-700 p-2 text-center bg-slate-800">VER.</th>
                  <th className="w-16 border-r border-slate-700 p-2 text-center bg-indigo-900/40">IMP.</th>
                  <th className="w-16 border-r border-slate-700 p-2 text-center bg-emerald-900/40">TOT.</th>
                  <th className="w-16 border-r border-slate-700 p-2 text-center bg-blue-900/40">SCORTA</th>
                  <th className="w-24 p-2 text-center bg-slate-800">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredArticles.map((a, idx) => {
                  const p = processes.find(proc => String(proc.articolo_id) === String(a.id));
                  const disp = getDisponibilita(a, commitments);
                  const isEditing = editingArticleId === a.id;
                  const cat = getCategory(a.nome || '', a.codice || '');
                  const taglioEnabled = isPhaseEnabled(cat, 'taglio');
                  const piegaEnabled = isPhaseEnabled(cat, 'piega');
                  const saldaturaEnabled = isPhaseEnabled(cat, 'saldatura');
                  const grezzoEnabled = isPhaseEnabled(cat, 'grezzo');

                  return (
                    <tr key={a.id} className={clsx(
                      "hover:bg-blue-50/30 transition-colors group",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    )}>
                      <td className="border-b border-r border-slate-200 p-1 text-center text-[10px] font-bold text-slate-400 sticky left-0 z-20 bg-inherit group-hover:bg-blue-50/30">
                        {idx + 1}
                      </td>
                      <td className="border-b border-r border-slate-200 p-1 text-[11px] font-bold text-slate-800 truncate sticky left-10 z-20 bg-inherit group-hover:bg-blue-50/30">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white border border-blue-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500/20" 
                            value={editFormData.nome} 
                            onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})}
                          />
                        ) : a.nome}
                      </td>
                      <td className="border-b border-r border-slate-200 p-1 text-[10px] font-mono font-medium text-slate-500">
                        {isEditing ? (
                          <input 
                            type="text" 
                            className="w-full bg-white border border-blue-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500/20" 
                            value={editFormData.codice} 
                            onChange={(e) => setEditFormData({...editFormData, codice: e.target.value})}
                          />
                        ) : a.codice}
                      </td>
                      <td className={clsx(
                        "border-b border-r border-slate-200 p-1 text-center font-mono text-xs",
                        !saldaturaEnabled ? "bg-slate-100 text-slate-300" : "text-slate-600"
                      )}>
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full text-center border rounded p-0.5" 
                            value={editFormData.saldatura} 
                            onChange={(e) => setEditFormData({...editFormData, saldatura: parseInt(e.target.value) || 0})}
                          />
                        ) : (p?.saldatura || 0)}
                      </td>
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-slate-600">
                        {isEditing ? (
                          <input 
                            type="number" 
                            className="w-full text-center border rounded p-0.5" 
                            value={editFormData.verniciatura} 
                            onChange={(e) => setEditFormData({...editFormData, verniciatura: parseInt(e.target.value) || 0})}
                          />
                        ) : (a.verniciati || 0)}
                      </td>
                      {renderImpCell(a)}
                      <td className={clsx(
                        "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-black",
                        disp < 0 ? "text-red-600 bg-red-50" : disp > 0 ? "text-emerald-600 bg-emerald-50" : "text-slate-400"
                      )}>
                        {disp}
                      </td>
                      <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-blue-600 font-bold bg-blue-50/20">
                        {a.scorta || 0}
                      </td>
                      <td className="border-b border-slate-200 p-1">
                        <div className="flex items-center justify-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Salva">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button onClick={() => setEditingArticleId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Annulla">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {canAutoCut && taglioEnabled && (
                                <button 
                                  onClick={() => handleAutoCut(a)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                  title="Registra Taglio"
                                >
                                  <Scissors className="h-4 w-4" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleEditClick(a, p)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                                title="Modifica"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Auto Cut Modal */}
      {isCutModalOpen && selectedArticleForCut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Scissors className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">Registra Taglio</h3>
                </div>
                <button onClick={() => setIsCutModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                <p className="text-xs font-black text-blue-100 uppercase tracking-widest mb-1">Articolo Selezionato</p>
                <p className="text-lg font-bold leading-tight">{selectedArticleForCut.nome}</p>
                <p className="text-xs font-mono text-blue-200 mt-1">{selectedArticleForCut.codice}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantità</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                    value={cutForm.quantita}
                    onChange={(e) => setCutForm({...cutForm, quantita: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ODL</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                    placeholder="Es: 12345"
                    value={cutForm.odl}
                    onChange={(e) => setCutForm({...cutForm, odl: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Macchina</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setCutForm({...cutForm, macchina: 'Macchina 5000'})}
                    className={clsx(
                      "py-3 px-4 rounded-2xl text-xs font-black tracking-widest transition-all border-2",
                      cutForm.macchina === 'Macchina 5000' 
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    MACCHINA 5000
                  </button>
                  <button 
                    onClick={() => setCutForm({...cutForm, macchina: 'Taglio Laser'})}
                    className={clsx(
                      "py-3 px-4 rounded-2xl text-xs font-black tracking-widest transition-all border-2",
                      cutForm.macchina === 'Taglio Laser' 
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" 
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    TAGLIO LASER
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={submitAutoCut}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-2xl font-black tracking-widest shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                >
                  <Play className="h-5 w-5" />
                  CONFERMA REGISTRAZIONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

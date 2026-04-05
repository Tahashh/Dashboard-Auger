import React, { useState } from 'react';
import { Article, Commitment } from '../types';
import { getCategory, isPhaseEnabled } from '../utils';
import { ArrowRightLeft, Plus, Minus, Edit3, PackageCheck, X, AlertTriangle, CheckSquare, Square, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { fetchCommitments, fetchArticles, fetchProcesses, updateArticle, updateProcess, updateCommitment, addMovementLog, fulfillByCommessa } from '../api';

interface CommitmentWithStock extends Commitment {
  verniciati: number;
  piega: number;
  taglio: number;
  saldatura: number;
}

interface ProductionMovementProps {
  articles: Article[];
  onUpdate: () => void;
  username?: string;
  role?: string;
}

export default function ProductionMovement({ articles, onUpdate, username, role }: ProductionMovementProps) {
  const [rows, setRows] = useState<{ articoloId: string; quantita: number | '' }[]>([{ articoloId: '', quantita: '' }]);
  const [fase, setFase] = useState<string>('taglio');
  const [tipo, setTipo] = useState<string>('carico');
  
  // Scarico Commessa state
  const [commessaDaScaricare, setCommessaDaScaricare] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [commessaItems, setCommessaItems] = useState<CommitmentWithStock[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    setRows([...rows, { articoloId: '', quantita: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      const newRows = [...rows];
      newRows.splice(index, 1);
      setRows(newRows);
    }
  };

  const updateRow = (index: number, field: 'articoloId' | 'quantita', value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleOpenModal = async () => {
    if (!commessaDaScaricare) return;
    
    setLoading(true);
    try {
      const allCommitments = await fetchCommitments();
      const commitmentsArray = Array.isArray(allCommitments) ? allCommitments : [];
      const filteredCommitments = commitmentsArray.filter(c => c.commessa === commessaDaScaricare);
      
      if (filteredCommitments.length === 0) {
        toast.error('Nessun impegno trovato per questa commessa');
        return;
      }
      
      const allArticles = await fetchArticles();
      const allProcesses = await fetchProcesses();
      
      const data: CommitmentWithStock[] = [];
      for (const commitment of filteredCommitments) {
        const article = allArticles.find(a => a.id === commitment.articolo_id);
        const process = allProcesses.find(p => p.articolo_id === commitment.articolo_id);
        
        let verniciati = 0;
        let piega = 0;
        let taglio = 0;
        let saldatura = 0;
        
        if (article) {
          verniciati = article.verniciati || 0;
        }
        if (process) {
          piega = process.piega || 0;
          taglio = process.taglio || 0;
          saldatura = process.saldatura || 0;
        }
        
        data.push({
          ...commitment,
          verniciati,
          piega,
          taglio,
          saldatura
        });
      }
      
      setCommessaItems(data);
      setSelectedIds(data.map(item => item.id)); // Default all selected
      setShowModal(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Errore nel recupero della commessa');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmFulfillment = async () => {
    if (selectedIds.length === 0) {
      toast.error('Seleziona almeno un articolo da scaricare');
      return;
    }

    setLoading(true);
    try {
      const result = await fulfillByCommessa(commessaDaScaricare, selectedIds, username || 'System');
      if (result && result.success) {
        toast.success('Articoli evasi con successo!');
        setCommessaDaScaricare('');
        setCommessaItems([]);
        setSelectedIds([]);
        setShowModal(false);
        onUpdate();
      } else {
        toast.error(result.error || 'Errore durante l\'evasione');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Errore durante lo scarico');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (fase === 'impegni') {
      handleOpenModal();
      return;
    }
    
    const validRows = rows.filter(r => r.articoloId && r.quantita !== '');
    if (validRows.length === 0) return;

    setLoading(true);
    try {
      const allArticles = await fetchArticles();
      const allProcesses = await fetchProcesses();
      
      for (const row of validRows) {
        const article = allArticles.find(a => a.codice === row.articoloId || a.id === row.articoloId);
        if (!article) throw new Error(`Articolo non trovato: ${row.articoloId}`);
        
        const qty = parseInt(row.quantita.toString(), 10);
        if (isNaN(qty) || qty < 0 || (qty === 0 && tipo !== 'rettifica')) throw new Error(`Quantità non valida per ${article.nome}`);

        const category = getCategory(article.nome, article.codice);
        const catLower = category.toLowerCase();

        if (fase === 'saldatura' || fase === 'verniciatura') {
          if (catLower.includes('piastre')) {
            throw new Error(`Non è possibile registrare movimenti in ${fase} per ${article.nome}. Le piastre hanno solo la fase di piegatura (grezzo).`);
          }
        }
        if (fase === 'saldatura') {
          if (tipo === 'carico' && (catLower.includes('porte') || catLower.includes('retri') || catLower.includes('tetti') || catLower.includes('laterali'))) {
            throw new Error(`Non è possibile aggiungere un carico alla saldatura per ${article.nome}. Questi articoli vanno saldati ma vengono registrati solo nel grezzo.`);
          }
        }

        const processData = allProcesses.find(p => p.articolo_id === article.id);
        if (!processData) throw new Error(`Processi non trovati per ${article.nome}`);

        await addMovementLog({
          articolo_id: article.id,
          articolo_nome: article.nome,
          articolo_codice: article.codice,
          fase: tipo === 'scarico' ? 'Scarico' : fase,
          tipo: tipo === 'scarico' ? 'scarico da commessa' : tipo,
          quantita: qty,
          operatore: username || 'System',
          timestamp: new Date().toISOString()
        });
      }

      toast.success(`Movimento registrato con successo per ${validRows.length} articol${validRows.length === 1 ? 'o' : 'i'}!`);
      setRows([{ articoloId: '', quantita: '' }]);
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Errore nella registrazione del movimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 flex flex-col h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
          <ArrowRightLeft className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registra Movimento</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fase / Reparto</label>
          <select 
            value={role === 'taglio_only' ? 'taglio' : fase}
            onChange={(e) => setFase(e.target.value)}
            disabled={role === 'taglio_only'}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="taglio">Taglio</option>
            <option value="piega">Piega (Gre.)</option>
            <option value="saldatura">Saldatura</option>
            <option value="verniciatura">Verniciatura</option>
            <option value="impegni">Impegni Clienti (Scarico Commessa)</option>
          </select>
        </div>

        {fase === 'impegni' ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-2">
            <div className="flex items-center gap-2 mb-3 text-indigo-800">
              <PackageCheck className="h-5 w-5" />
              <h3 className="font-bold">Scarico Commessa</h3>
            </div>
            <p className="text-xs text-indigo-600 mb-4">
              Inserisci il numero di commessa per evadere automaticamente tutti gli articoli associati.
              I pezzi verranno scalati dalla disponibilità (dal magazzino verniciati, o piegati per le piastre).
            </p>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Numero Commessa</label>
              <input 
                type="text" 
                value={commessaDaScaricare}
                onChange={(e) => {
                  let val = e.target.value;
                  if (val) {
                    const upper = val.toUpperCase();
                    if (!upper.startsWith('C.')) {
                      if (upper.startsWith('C')) {
                        val = 'C.' + val.substring(1);
                      } else {
                        val = 'C.' + val;
                      }
                    }
                  }
                  setCommessaDaScaricare(val);
                }}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                placeholder="Es. C.1234"
                required
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg p-2 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-slate-600">Articoli da Registrare</h3>
                <button 
                  type="button"
                  onClick={addRow}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Aggiungi Riga
                </button>
              </div>
              
              {rows.map((row, index) => (
                <div key={index} className="flex gap-2 mb-2 items-end bg-white p-2 rounded border border-slate-200 shadow-sm">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Articolo</label>
                    <input 
                      list="articles-list-mov"
                      value={row.articoloId}
                      onChange={(e) => updateRow(index, 'articoloId', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                      placeholder="Codice o nome"
                      required
                    />
                    <datalist id="articles-list-mov">
                      {articles.filter(a => isPhaseEnabled(getCategory(a.nome, a.codice), fase)).map(a => (
                        <option key={a.id} value={a.codice}>{a.nome}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Quantità</label>
                    <input 
                      type="number" 
                      min={tipo === 'rettifica' ? "0" : "1"}
                      value={row.quantita}
                      onChange={(e) => updateRow(index, 'quantita', e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                      placeholder="Q.tà"
                      required
                    />
                  </div>
                  {rows.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-red-500 hover:text-red-700 p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Operazione</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo('carico')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'carico' ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Plus className="h-4 w-4 mb-1" />
                  Carico
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('scarico')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'scarico' ? "bg-amber-50 border-amber-200 text-amber-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Minus className="h-4 w-4 mb-1" />
                  Scarico
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('rettifica')}
                  className={clsx(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-sm transition-colors",
                    tipo === 'rettifica' ? "bg-blue-50 border-blue-200 text-blue-700 font-medium" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Edit3 className="h-4 w-4 mb-1" />
                  Rettifica
                </button>
              </div>
            </div>
          </>
        )}

        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={loading || (fase === 'impegni' ? !commessaDaScaricare : rows.filter(r => r.articoloId && r.quantita !== '').length === 0)}
            className={clsx(
              "w-full text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              fase === 'impegni' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {loading ? 'Elaborazione...' : (fase === 'impegni' ? 'Scarica Commessa' : 'Conferma Movimento')}
          </button>
        </div>
      </form>

      {/* Modal Scarico Commessa */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm font-sans">
          
          {/* POPUP ARTICOLI */}
          <div className="bg-white rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-4 w-[600px] max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="mb-2.5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Articoli commessa</h3>
                <p className="text-xs text-slate-500 font-mono font-bold">{commessaDaScaricare}</p>
              </div>
              <div className="text-xs text-slate-500">
                Selezionati: <span className="font-bold text-indigo-600">{selectedIds.length}</span>/{commessaItems.length}
              </div>
            </div>

            <div className="grid grid-cols-[40px_1fr_80px_80px] items-center font-semibold text-xs text-gray-500 pb-1.5 border-b border-gray-200">
              <div className="flex justify-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === commessaItems.length && commessaItems.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(commessaItems.map(i => i.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              <span>Articolo</span>
              <span className="text-center">Q.tà</span>
              <span className="text-right pr-2">Stock</span>
            </div>

            <div className="overflow-y-auto flex-1 mt-2 min-h-[300px] max-h-[60vh] light-scrollbar pr-2">
              {commessaItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const fase = item.fase_produzione?.toLowerCase() || 'generico';
                let available = 0;
                let tipo = '';
                if (fase === 'taglio') {
                  available = item.taglio;
                  tipo = 'tag';
                } else if (fase === 'piega') {
                  available = item.piega;
                  tipo = 'gre';
                } else if (fase === 'saldatura') {
                  available = item.saldatura;
                  tipo = 'sal';
                } else if (fase === 'verniciatura') {
                  available = item.verniciati;
                  tipo = 'ver';
                } else {
                  const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
                  available = isPiastra ? item.piega : item.verniciati;
                  tipo = isPiastra ? 'gre' : 'ver';
                }
                const hasStock = available >= item.quantita;

                return (
                  <div 
                    key={item.id} 
                    className="grid grid-cols-[40px_1fr_80px_80px] items-center py-2 border-b border-gray-100 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => toggleSelection(item.id)}
                  >
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {}} // Handled by parent div click
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <div className="truncate pr-2 flex flex-col">
                      <span className="font-medium text-slate-800 truncate text-[13px]">{item.articolo_nome}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{item.articolo_codice}</span>
                    </div>
                    <span className="text-center font-medium">{item.quantita}</span>
                    <div className="text-right pr-2 flex flex-col items-end">
                      <span className={clsx("font-semibold text-xs", hasStock ? "text-[#2e7d32]" : "text-[#e53935]")}>
                        {available}
                      </span>
                      <span className="text-[8px] uppercase text-slate-400">{tipo}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* POPUP AZIONI */}
          <div className="bg-white rounded-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.15)] p-4 ml-5 flex flex-col gap-2.5 h-fit w-[150px] animate-in slide-in-from-right-8 duration-300">
            <button 
              onClick={handleConfirmFulfillment}
              disabled={loading || selectedIds.length === 0}
              className="p-3 rounded-[10px] border-none font-semibold cursor-pointer bg-gradient-to-br from-[#5b5fff] to-[#7a5cff] text-white disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Conferma
            </button>
            <button 
              onClick={() => setShowModal(false)}
              className="p-3 rounded-[10px] border-none font-semibold cursor-pointer bg-[#f3f4f6] text-slate-700 hover:bg-gray-200 transition-colors"
            >
              Annulla
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

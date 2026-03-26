import React, { useState } from 'react';
import { Article, Commitment } from '../types';
import { getCategory, isPhaseEnabled } from '../utils';
import { ArrowRightLeft, Plus, Minus, Edit3, PackageCheck, X, AlertTriangle, CheckSquare, Square, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';
import { fetchCommitments, fetchArticles, fetchProcesses, updateArticle, updateProcess, updateCommitment, addMovementLog } from '../api';

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
}

export default function ProductionMovement({ articles, onUpdate, username }: ProductionMovementProps) {
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
      const filteredCommitments = allCommitments.filter(c => c.commessa === commessaDaScaricare);
      
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

    // Check if all selected items have enough stock
    const missingItems = selectedIds.map(id => {
      const item = commessaItems.find(i => i.id === id);
      if (!item) return null;
      
      let available = 0;
      let tipo = '';
      const fase = item.fase_produzione?.toLowerCase() || 'generico';
      
      if (fase === 'taglio') {
        available = item.taglio;
        tipo = 'tagliati';
      } else if (fase === 'piega') {
        available = item.piega;
        tipo = 'piegati';
      } else if (fase === 'saldatura') {
        available = item.saldatura;
        tipo = 'saldati';
      } else if (fase === 'verniciatura') {
        available = item.verniciati;
        tipo = 'verniciati';
      } else {
        // Generico
        const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
        available = isPiastra ? item.piega : item.verniciati;
        tipo = isPiastra ? 'piegate' : 'verniciate';
      }
      
      if (available < item.quantita) {
        return {
          nome: item.articolo_nome,
          mancanti: item.quantita - available,
          tipo
        };
      }
      return null;
    }).filter(Boolean);

    if (missingItems.length > 0) {
      const errorMsg = missingItems.map(m => `${m!.nome}: mancano ${m!.mancanti} pz ${m!.tipo}`).join('\n');
      toast.error(`Impossibile evadere: stock insufficiente.\n${errorMsg}`, { duration: 6000 });
      return;
    }

    setLoading(true);
    try {
      const allArticles = await fetchArticles();
      const allProcesses = await fetchProcesses();
      const itemsToFulfill = commessaItems.filter(item => selectedIds.includes(item.id));
      
      for (const item of itemsToFulfill) {
        const articleData = allArticles.find(a => a.id === item.articolo_id);
        const processData = allProcesses.find(p => p.articolo_id === item.articolo_id);
        
        if (!articleData) {
          throw new Error(`Articolo non trovato: ${item.articolo_nome}`);
        }
        
        const fase = item.fase_produzione?.toLowerCase() || 'generico';
        
        if (fase === 'taglio') {
          if (!processData) throw new Error(`Processo non trovato per: ${item.articolo_nome}`);
          if (processData.taglio < item.quantita) throw new Error(`Stock taglio insufficiente per ${item.articolo_nome}`);
          
          await updateProcess(processData.id, {
            taglio: processData.taglio - item.quantita
          });
        } else if (fase === 'piega') {
          if (!processData) throw new Error(`Processo non trovato per: ${item.articolo_nome}`);
          if (processData.piega < item.quantita) throw new Error(`Stock piega insufficiente per ${item.articolo_nome}`);
          
          await updateProcess(processData.id, {
            piega: processData.piega - item.quantita
          });
          await updateArticle(articleData.id, {
            piega: Math.max(0, (articleData.piega || 0) - item.quantita)
          });
        } else if (fase === 'saldatura') {
          if (!processData) throw new Error(`Processo non trovato per: ${item.articolo_nome}`);
          if (processData.saldatura < item.quantita) throw new Error(`Stock saldatura insufficiente per ${item.articolo_nome}`);
          
          await updateProcess(processData.id, {
            saldatura: processData.saldatura - item.quantita
          });
        } else if (fase === 'verniciatura') {
          if (articleData.verniciati < item.quantita) throw new Error(`Stock verniciati insufficiente per ${item.articolo_nome}`);
          
          await updateArticle(articleData.id, {
            verniciati: articleData.verniciati - item.quantita
          });
          if (processData) {
            await updateProcess(processData.id, {
              verniciatura: Math.max(0, (processData.verniciatura || 0) - item.quantita)
            });
          }
        } else {
          // Generico
          const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
          
          if (isPiastra) {
            if (!processData) {
              throw new Error(`Processo non trovato per: ${item.articolo_nome}`);
            }
            
            if (processData.piega < item.quantita) {
              throw new Error(`Stock piega insufficiente per ${item.articolo_nome}`);
            }
            
            await updateProcess(processData.id, {
              piega: processData.piega - item.quantita
            });
            
            await updateArticle(articleData.id, {
              piega: (articleData.piega || 0) - item.quantita
            });
          } else {
            if (articleData.verniciati < item.quantita) {
              throw new Error(`Stock verniciati insufficiente per ${item.articolo_nome}`);
            }
            
            await updateArticle(articleData.id, {
              verniciati: articleData.verniciati - item.quantita
            });
            
            if (processData) {
              await updateProcess(processData.id, {
                verniciatura: Math.max(0, (processData.verniciatura || 0) - item.quantita)
              });
            }
          }
        }
        
        // Update impegni_clienti
        await updateArticle(articleData.id, {
          impegni_clienti: Math.max(0, (articleData.impegni_clienti || 0) - item.quantita)
        });
        
        // Mark commitment as completed
        await updateCommitment(item.id, {
          stato_lavorazione: 'Completato',
          timestamp_modifica: new Date().toISOString()
        });
        
        // Log movement
        await addMovementLog({
          articolo_id: item.articolo_id,
          articolo_nome: item.articolo_nome,
          articolo_codice: item.articolo_codice,
          fase: 'impegni_evasione',
          tipo: 'evasione',
          quantita: item.quantita,
          operatore: username || 'System',
          timestamp: new Date().toISOString(),
          cliente: item.cliente,
          commessa: item.commessa
        });
      }

      toast.success('Commessa evasa con successo!');
      setCommessaDaScaricare('');
      setShowModal(false);
      onUpdate();
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
    
    const validRows = rows.filter(r => r.articoloId && r.quantita);
    if (validRows.length === 0) return;

    setLoading(true);

    try {
      const allArticles = await fetchArticles();
      const allProcesses = await fetchProcesses();
      
      for (const row of validRows) {
        const article = allArticles.find(a => a.codice === row.articoloId || a.id === row.articoloId);
        if (!article) throw new Error(`Articolo non trovato: ${row.articoloId}`);
        
        const qty = parseInt(row.quantita.toString(), 10);
        if (isNaN(qty) || qty < 0) throw new Error(`Quantità non valida per ${article.nome}`);

        const processData = allProcesses.find(p => p.articolo_id === article.id);
        if (!processData) throw new Error(`Processi non trovati per ${article.nome}`);

        await addMovementLog({
          articolo_id: article.id,
          articolo_nome: article.nome,
          articolo_codice: article.codice,
          fase,
          tipo,
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
            value={fase}
            onChange={(e) => setFase(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
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
                onChange={(e) => setCommessaDaScaricare(e.target.value)}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Es. C-1234"
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
                      min="1"
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
            disabled={loading || (fase === 'impegni' ? !commessaDaScaricare : rows.filter(r => r.articoloId && r.quantita).length === 0)}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <PackageCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Verifica Scarico Commessa</h3>
                  <p className="text-xs text-slate-500 font-mono">{commessaDaScaricare}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Attenzione</p>
                  <p>Seleziona solo gli articoli fisicamente pronti per la spedizione. Gli articoli non selezionati rimarranno come impegni attivi.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-400 px-2">
                  <div className="col-span-1"></div>
                  <div className="col-span-6">Articolo</div>
                  <div className="col-span-2 text-center">Q.tà</div>
                  <div className="col-span-3 text-right">Stock Disp.</div>
                </div>
                
                {commessaItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const fase = item.fase_produzione?.toLowerCase() || 'generico';
                  let available = 0;
                  let tipo = '';
                  if (fase === 'taglio') {
                    available = item.taglio;
                    tipo = 'tagliati';
                  } else if (fase === 'piega') {
                    available = item.piega;
                    tipo = 'piegati';
                  } else if (fase === 'saldatura') {
                    available = item.saldatura;
                    tipo = 'saldati';
                  } else if (fase === 'verniciatura') {
                    available = item.verniciati;
                    tipo = 'verniciati';
                  } else {
                    const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
                    available = isPiastra ? item.piega : item.verniciati;
                    tipo = isPiastra ? 'piegate' : 'verniciate';
                  }
                  const hasStock = available >= item.quantita;

                  return (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={clsx(
                        "grid grid-cols-12 gap-2 items-center p-3 rounded-xl border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-indigo-50 border-indigo-200" 
                          : "bg-white border-slate-100 opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <div className="col-span-1 flex justify-center">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <div className="col-span-6">
                        <div className="font-bold text-slate-800 text-sm truncate">{item.articolo_nome}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.articolo_codice}</div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="bg-white border border-slate-200 px-2 py-1 rounded font-bold text-slate-700 text-xs">
                          {item.quantita}
                        </span>
                      </div>
                      <div className="col-span-3 text-right">
                        <div className={clsx(
                          "text-xs font-bold",
                          hasStock ? "text-emerald-600" : "text-red-600"
                        )}>
                          {available} pz {tipo === 'tagliati' ? '(Tag.)' : tipo === 'saldati' ? '(Sal.)' : tipo === 'piegati' || tipo === 'piegate' ? '(Gre.)' : '(Ver.)'}
                        </div>
                        {!hasStock && isSelected && (
                          <div className="text-[9px] text-red-500 font-medium">Stock insufficiente!</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmFulfillment}
                disabled={loading || selectedIds.length === 0}
                className="flex-[2] px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <PackageCheck className="h-5 w-5" />
                )}
                Conferma Scarico ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

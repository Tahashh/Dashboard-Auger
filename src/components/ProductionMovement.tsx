import React, { useState } from 'react';
import { Article, Commitment } from '../types';
import { ArrowRightLeft, Plus, Minus, Edit3, PackageCheck, X, AlertTriangle, CheckSquare, Square, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-hot-toast';

interface CommitmentWithStock extends Commitment {
  verniciati: number;
  piega: number;
}

interface ProductionMovementProps {
  articles: Article[];
  onUpdate: () => void;
  username?: string;
}

export default function ProductionMovement({ articles, onUpdate, username }: ProductionMovementProps) {
  const [articoloId, setArticoloId] = useState<string>('');
  const [fase, setFase] = useState<string>('taglio');
  const [tipo, setTipo] = useState<string>('carico');
  const [quantita, setQuantita] = useState<number | ''>('');
  
  // Scarico Commessa state
  const [commessaDaScaricare, setCommessaDaScaricare] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [commessaItems, setCommessaItems] = useState<CommitmentWithStock[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleOpenModal = async () => {
    if (!commessaDaScaricare) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/commitments/by-commessa/${encodeURIComponent(commessaDaScaricare)}`);
      if (!res.ok) throw new Error('Errore nel recupero della commessa');
      
      const data: CommitmentWithStock[] = await res.json();
      if (data.length === 0) {
        toast.error('Nessun impegno trovato per questa commessa');
        return;
      }
      
      setCommessaItems(data);
      setSelectedIds(data.map(item => item.id)); // Default all selected
      setShowModal(true);
    } catch (error: any) {
      toast.error(error.message);
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
      
      const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
      const available = isPiastra ? item.piega : item.verniciati;
      
      if (available < item.quantita) {
        return {
          nome: item.articolo_nome,
          mancanti: item.quantita - available,
          tipo: isPiastra ? 'piegate' : 'verniciate'
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
      const res = await fetch('/api/commitments/fulfill-by-commessa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          commessa: commessaDaScaricare,
          ids: selectedIds
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante lo scarico');
      }

      toast.success('Commessa evasa con successo!');
      setCommessaDaScaricare('');
      setShowModal(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
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

    // Standard movement
    if (!articoloId || !quantita) return;

    setLoading(true);

    try {
      const res = await fetch('/api/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolo_id: parseInt(articoloId),
          fase,
          tipo,
          quantita: parseInt(quantita.toString()),
          operatore: username || 'System'
        })
      });

      if (!res.ok) throw new Error('Errore durante la registrazione');

      toast.success('Movimento registrato con successo!');
      setQuantita('');
      onUpdate();
    } catch (error) {
      toast.error('Errore nella registrazione del movimento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-100 p-2 rounded-lg">
          <ArrowRightLeft className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Registra Movimento</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fase / Reparto</label>
          <select 
            value={fase}
            onChange={(e) => {
              const newFase = e.target.value;
              setFase(newFase);
              if (newFase === 'verniciatura' && articoloId) {
                const selectedArticle = articles.find(a => a.id.toString() === articoloId);
                if (selectedArticle?.nome.toLowerCase().includes('piastra')) {
                  setArticoloId('');
                }
              }
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
          >
            <option value="taglio">Taglio</option>
            <option value="piega">Piega</option>
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
              I pezzi verranno scalati dalla disponibilità e dal magazzino verniciati.
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Articolo</label>
              <select 
                value={articoloId}
                onChange={(e) => setArticoloId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                required
              >
                <option value="">Seleziona un articolo...</option>
                {articles
                  .filter(a => fase !== 'verniciatura' || !a.nome.toLowerCase().includes('piastra'))
                  .map(a => (
                  <option key={a.id} value={a.id}>{a.nome} ({a.codice})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantità</label>
              <input 
                type="number" 
                min="1"
                value={quantita}
                onChange={(e) => setQuantita(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="Es. 100"
                required
              />
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
          {message.text && (
            <div className={clsx(
              "mb-3 p-2 rounded text-sm text-center font-medium",
              message.type === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}>
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || (fase === 'impegni' ? !commessaDaScaricare : (!articoloId || !quantita))}
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
                  const isPiastra = item.articolo_nome.toLowerCase().includes('piastra');
                  const available = isPiastra ? item.piega : item.verniciati;
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
                          {available} pz {isPiastra ? '(Gre.)' : '(Ver.)'}
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

import { useState } from 'react';
import clsx from 'clsx';
import { Commitment, Article, AUTHORIZED_USERS } from '../types';
import { CheckCircle2, Package, ListOrdered, Truck, Edit2, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CommitmentPriorityManager from './CommitmentPriorityManager';
import { updateArticle, updateProcess, updateCommitment, addMovementLog, shipCommitment, fulfillCommitment } from '../api';

interface CommitmentsViewProps {
  onUpdate: () => void;
  username: string;
  articles: Article[];
  commitments: Commitment[];
}

export default function CommitmentsView({ onUpdate, username, articles, commitments }: CommitmentsViewProps) {
  const [showPriorityManager, setShowPriorityManager] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    cliente: string;
    commessa: string;
    quantita: number;
    articolo_id: string;
    note: string;
  }>({ cliente: '', commessa: '', quantita: 0, articolo_id: '', note: '' });

  const isAuthorized = AUTHORIZED_USERS.includes(username);
  const canEdit = ['lucaturati', 'adeleturati', 'robertobonalumi'].includes((username || '').toLowerCase());

  const startEdit = (c: Commitment) => {
    if (!canEdit) return;
    setEditingId(c.id);
    setEditForm({
      cliente: c.cliente,
      commessa: c.commessa,
      quantita: c.quantita,
      articolo_id: c.articolo_id,
      note: c.note || ''
    });
  };

  const saveEdit = async (id: string) => {
    if (!canEdit) return;
    try {
      const qty = parseInt(editForm.quantita.toString(), 10);
      if (isNaN(qty) || qty <= 0) {
        toast.error("Quantità non valida");
        return;
      }
      
      await updateCommitment(id, {
        cliente: editForm.cliente,
        commessa: editForm.commessa,
        quantita: qty,
        articolo_id: editForm.articolo_id,
        note: editForm.note,
        operatore: username
      });
      
      toast.success("Impegno aggiornato con successo");
      setEditingId(null);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'aggiornamento");
      console.error("Error updating commitment:", error);
    }
  };

  const handleFulfill = async (id: string) => {
    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      await fulfillCommitment(id, username);
      toast.success('Impegno evaso con successo!');
      onUpdate();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Errore sconosciuto');
      toast.error(message, { duration: 5000 });
      console.error("Error fulfilling commitment:", error);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleShip = async (id: string) => {
    if ((username || '').toLowerCase() !== 'samantalimonta') {
      toast.error('Utente non autorizzato. Solo SamantaLimonta può segnare le commesse come evase/spedite.', {
        duration: 5000,
        icon: '🛑'
      });
      return;
    }

    if (loadingActionId) return;
    setLoadingActionId(id);
    try {
      await shipCommitment(id, username);
      toast.success('Commessa spedita con successo!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message, { duration: 5000 });
      console.error("Error shipping commitment:", error);
    } finally {
      setLoadingActionId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      // Append 'Z' to treat SQLite's UTC timestamp correctly
      const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

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

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="p-5 border-b border-slate-200/80 bg-white/50 backdrop-blur-sm flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
            <Package className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Elenco Impegni Attivi</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full flex gap-3">
            <span>Righe: {(commitments || []).length}</span>
            <span className="w-px bg-slate-300"></span>
            <span>Totale Pezzi: {(commitments || []).reduce((sum, c) => sum + (c.quantita || 0), 0)}</span>
          </div>
          {isAuthorized && (
            <button
              onClick={() => setShowPriorityManager(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
            >
              <ListOrdered className="h-4 w-4" />
              Gestisci Priorità
            </button>
          )}
        </div>
      </div>

      {showPriorityManager && (
        <CommitmentPriorityManager 
          onClose={() => setShowPriorityManager(false)} 
          onUpdate={onUpdate} 
        />
      )}

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        {(commitments || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Package className="h-12 w-12 mb-2 opacity-20" />
            <p>Nessun impegno attivo.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm shadow-sm">
              <tr className="bg-slate-100/50 text-slate-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Cliente / Commessa</th>
                <th className="px-4 py-3 font-semibold">Articolo</th>
                <th className="px-4 py-3 font-semibold">Fase / Stato</th>
                <th className="px-4 py-3 font-semibold text-center">Priorità</th>
                <th className="px-4 py-3 font-semibold text-center">Q.tà</th>
                {(isAuthorized || (username || '').toLowerCase() === 'samantalimonta') && <th className="px-4 py-3 font-semibold text-center">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(commitments || []).map((c) => {
                if (editingId === c.id) {
                  return (
                    <tr key={c.id} className="bg-blue-50/50">
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(c.data_inserimento)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={editForm.cliente}
                            onChange={(e) => setEditForm({ ...editForm, cliente: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Cliente"
                          />
                          <input
                            type="text"
                            value={editForm.commessa}
                            onChange={(e) => setEditForm({ ...editForm, commessa: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                            placeholder="Commessa"
                          />
                          <input
                            type="text"
                            value={editForm.note}
                            onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Mese / Note"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.articolo_id}
                          onChange={(e) => setEditForm({ ...editForm, articolo_id: e.target.value })}
                          className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleziona articolo...</option>
                          {(articles || []).map(a => (
                            <option key={a.id} value={a.id}>{a.nome} ({a.codice})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                          {c.fase_produzione || 'Generico'}
                        </div>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-2 mb-1 ${
                          c.stato_lavorazione === 'Completato' ? 'bg-emerald-100 text-emerald-800' :
                          c.stato_lavorazione === 'In Lavorazione' ? 'bg-blue-100 text-blue-800' :
                          c.stato_lavorazione === 'Annullato' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {c.stato_lavorazione || 'Pianificato'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.priorita > 0 ? (
                          <div className={`inline-flex flex-col items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                            c.priorita <= 3 ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' :
                            c.priorita <= 10 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                            c.priorita <= 20 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            <span>{c.priorita}</span>
                            <span className="text-[8px] leading-none opacity-70">
                              {c.priorita <= 3 ? 'Urgente' :
                               c.priorita <= 10 ? 'Alta' :
                               c.priorita <= 20 ? 'Media' : 'Bassa'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={editForm.quantita}
                          onChange={(e) => setEditForm({ ...editForm, quantita: parseInt(e.target.value) || 0 })}
                          className="w-20 px-2 py-1 text-sm text-center border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition-colors"
                            title="Salva"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-md transition-colors"
                            title="Annulla"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(c.data_inserimento)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.cliente}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        {c.commessa}
                        {(() => {
                          const { additionalNote } = parseNote(c.note);
                          return additionalNote && <span className="text-emerald-600 ml-1 font-bold">N.B: {additionalNote}</span>;
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.articolo_nome}</div>
                      <div className="text-xs text-slate-500">{c.articolo_codice}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                        {c.fase_produzione || 'Generico'}
                      </div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ml-2 mb-1 ${
                        c.stato_lavorazione === 'Completato' ? 'bg-emerald-100 text-emerald-800' :
                        c.stato_lavorazione === 'In Lavorazione' ? 'bg-blue-100 text-blue-800' :
                        c.stato_lavorazione === 'Annullato' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {c.stato_lavorazione || 'Pianificato'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.priorita > 0 ? (
                        <div className={`inline-flex flex-col items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter ${
                          c.priorita <= 3 ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' :
                          c.priorita <= 10 ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                          c.priorita <= 20 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          <span>{c.priorita}</span>
                          <span className="text-[8px] leading-none opacity-70">
                            {c.priorita <= 3 ? 'Urgente' :
                             c.priorita <= 10 ? 'Alta' :
                             c.priorita <= 20 ? 'Media' : 'Bassa'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-bold">
                        {c.quantita}
                      </span>
                    </td>
                    {(isAuthorized || (username || '').toLowerCase() === 'samantalimonta') && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isAuthorized && c.stato_lavorazione !== 'Completato' && (
                            <button
                              onClick={() => handleFulfill(c.id)}
                              disabled={loadingActionId === c.id}
                              className={clsx(
                                "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                loadingActionId === c.id ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              )}
                              title="Segna come pronto per la consegna (scala pezzi)"
                            >
                              {loadingActionId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Pronto
                            </button>
                          )}
                          {(username || '').toLowerCase() === 'samantalimonta' && c.stato_lavorazione === 'Completato' && (
                            <button
                              onClick={() => handleShip(c.id)}
                              disabled={loadingActionId === c.id}
                              className={clsx(
                                "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                                loadingActionId === c.id ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                              )}
                              title="Segna come spedito (rimuove dalla lista)"
                            >
                              {loadingActionId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                              Spedisci
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => startEdit(c)}
                              className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                              title="Modifica impegno"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { TaglioLaser as TaglioLaserType, Article } from '../types';
import { fetchTaglioLaser, addTaglioLaser, updateTaglioLaser, deleteTaglioLaser, addMovementLog, addMovimentoCGialla } from '../api';
import { toast } from 'react-hot-toast';
import { Plus, Save, Trash2, CheckCircle, Clock, Play, Square, Loader2, RefreshCw, Edit2, X } from 'lucide-react';
import clsx from 'clsx';

interface TaglioLaserProps {
  articles: Article[];
  username: string;
  role: string;
  onUpdate: () => void;
}

export default function TaglioLaser({ articles, username, role, onUpdate }: TaglioLaserProps) {
  const [items, setItems] = useState<TaglioLaserType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Confirmation state
  const [confirmingItem, setConfirmingItem] = useState<TaglioLaserType | null>(null);
  const [confirmedQty, setConfirmedQty] = useState<number | ''>('');
  const [tempPrep, setTempPrep] = useState<number>(0);
  const [tempFine, setTempFine] = useState<string>('');
  
  // Form state for RidaTecnico
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newArticle, setNewArticle] = useState('');
  const [newQuantita, setNewQuantita] = useState<number | ''>('');
  const [newOdl, setNewOdl] = useState('');
  const [newCliente, setNewCliente] = useState('');
  const [newCommessa, setNewCommessa] = useState('');

  const canAddProgram = username === 'RidaTecnico' || (role === 'admin' && username !== 'Andrea' && username !== 'LucaTurati') || role === 'developer';
  const isOsvaldo = username === 'Osvaldo' || username === 'TahaDev';
  const isRida = username === 'RidaTecnico' || role === 'admin' || role === 'developer';
  const isDeveloper = role === 'developer';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchTaglioLaser();
      setItems(data);
    } catch (error: any) {
      toast.error('Errore nel caricamento dati Taglio Laser: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle || !newQuantita) return;

    try {
      await addTaglioLaser({
        data: newDate,
        articolo: newArticle,
        quantita: Number(newQuantita),
        preparazione: 0,
        inizio: null,
        inizio2: null,
        pausa: null,
        fine: null,
        totale_tempo: null,
        odl: newOdl || null,
        stato: 'da tagliare',
        operatore: null,
        cliente: newCliente || null,
        commessa: newCommessa || null
      });
      toast.success('Programma aggiunto con successo');
      setNewArticle('');
      setNewQuantita('');
      setNewOdl('');
      setNewCliente('');
      setNewCommessa('');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo programma?')) return;
    try {
      await deleteTaglioLaser(id);
      toast.success('Programma eliminato');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleStart = async (item: TaglioLaserType, prep: number) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTaglioLaser(item.id, {
        inizio: timeStr,
        stato: 'in lavorazione',
        preparazione: prep,
        operatore: username
      });
      toast.success('Lavorazione iniziata');
      loadData();
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handlePause = async (item: TaglioLaserType) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTaglioLaser(item.id, {
        pausa: timeStr,
        stato: 'in pausa',
        operatore: username
      });
      toast.success('Lavorazione in pausa');
      loadData(true);
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleResume = async (item: TaglioLaserType) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTaglioLaser(item.id, {
        inizio2: timeStr,
        stato: 'in lavorazione',
        operatore: username
      });
      toast.success('Lavorazione ripresa');
      loadData(true);
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleEnd = async (item: TaglioLaserType, prep: number) => {
    try {
      const timeStr = new Date().toISOString();
      await updateTaglioLaser(item.id, {
        fine: timeStr,
        stato: 'completato',
        preparazione: prep,
        operatore: username
      });
      toast.success('Lavorazione terminata');
      loadData();
      onUpdate();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleComplete = async (item: TaglioLaserType, prep: number, fine: string, confirmedQty: number) => {
    try {
      if (!item.inizio) throw new Error('Orario di inizio mancante');
      
      const parseTimeToDate = (timeStr: string | null, referenceDate?: Date) => {
        if (!timeStr) return null;
        if (timeStr.includes('T')) {
          return new Date(timeStr);
        }
        const [h, m] = timeStr.split(':').map(Number);
        const d = referenceDate ? new Date(referenceDate) : new Date();
        d.setHours(h, m, 0, 0);
        return d;
      };

      const startDate = parseTimeToDate(item.inizio);
      if (!startDate) throw new Error('Orario di inizio non valido');
      
      const endDate = parseTimeToDate(fine, startDate);
      if (!endDate) throw new Error('Orario di fine non valido');

      const getDiffMinutes = (d1: Date, d2: Date, t1: string, t2: string) => {
        let diff = (d2.getTime() - d1.getTime()) / 60000;
        // If both are manual HH:MM and diff is negative, assume midnight crossing
        if (!t1.includes('T') && !t2.includes('T') && diff < 0) {
          diff += 24 * 60;
        }
        return diff;
      };

      let totalMinutes = 0;
      if (item.pausa && item.inizio2) {
        const pauseDate = parseTimeToDate(item.pausa, startDate);
        const resumeDate = parseTimeToDate(item.inizio2, startDate);
        if (pauseDate && resumeDate) {
          const seg1 = getDiffMinutes(startDate, pauseDate, item.inizio, item.pausa);
          const seg2 = getDiffMinutes(resumeDate, endDate, item.inizio2, fine);
          totalMinutes = seg1 + seg2;
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, item.inizio, fine);
        }
      } else if (item.pausa) {
        const pauseDate = parseTimeToDate(item.pausa, startDate);
        if (pauseDate) {
          totalMinutes = getDiffMinutes(startDate, pauseDate, item.inizio, item.pausa);
        } else {
          totalMinutes = getDiffMinutes(startDate, endDate, item.inizio, fine);
        }
      } else {
        totalMinutes = getDiffMinutes(startDate, endDate, item.inizio, fine);
      }
      
      const totalTime = Math.round(totalMinutes) + prep;

      // Update Taglio Laser
      await updateTaglioLaser(item.id, {
        preparazione: prep,
        fine,
        totale_tempo: totalTime,
        stato: 'completato',
        operatore: username,
        quantita: confirmedQty
      });

      // Find article ID
      const articleObj = articles.find(a => a.codice === item.articolo || a.nome === item.articolo);
      
      if (articleObj) {
        // Add movement log
        await addMovementLog({
          articolo_id: articleObj.id,
          articolo_nome: articleObj.nome,
          articolo_codice: articleObj.codice,
          fase: 'Tagliato - Carico da Taglio Laser',
          tipo: 'carico',
          quantita: confirmedQty,
          quantita_lanciata: item.quantita,
          operatore: username,
          tempo: totalTime,
          timestamp: new Date().toISOString()
        });
        onUpdate();
      } else {
        // Special article - record in Movimenti C. Gialla
        await addMovimentoCGialla({
          articolo_spc: item.articolo,
          fase: 'Taglio',
          quantita: confirmedQty,
          cliente: item.cliente || '-',
          commessa: item.commessa || '-',
          operatore: username,
          tempo_min: totalTime,
          data_reg: new Date().toISOString()
        });
        toast.success('Articolo speciale registrato in Movimenti C. Gialla');
      }

      toast.success('Lavorazione completata e carico registrato');
      loadData();
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-slate-800">Taglio Laser</h1>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95"
          title="Aggiorna dati"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Form per RidaTecnico */}
      {canAddProgram && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Nuovo Programma di Taglio Laser
          </h2>
          <form onSubmit={handleAddProgram} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Articolo</label>
              <input
                list="articles-list-laser"
                value={newArticle}
                onChange={(e) => setNewArticle(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Codice o nome"
                required
              />
              <datalist id="articles-list-laser">
                {articles.map(a => (
                  <option key={a.id} value={a.codice}>{a.nome}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantità</label>
              <input
                type="number"
                min="1"
                value={newQuantita}
                onChange={(e) => setNewQuantita(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N. ODL (Opz.)</label>
              <input
                type="text"
                value={newOdl}
                onChange={(e) => setNewOdl(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
              <input
                type="text"
                value={newCliente}
                onChange={(e) => setNewCliente(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">N. Commessa</label>
              <input
                type="text"
                value={newCommessa}
                onChange={(e) => setNewCommessa(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="md:col-span-5 flex justify-end mt-2">
              <button
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Programma Completato
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista Lavorazioni */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            Lavorazioni Taglio Laser
          </h2>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            title="Aggiorna dati"
          >
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-2 py-3">Data</th>
                <th className="px-2 py-3">Cliente</th>
                <th className="px-2 py-3">Commessa</th>
                <th className="px-2 py-3">Articolo</th>
                <th className="px-2 py-3">Q.tà</th>
                <th className="px-2 py-3">ODL</th>
                <th className="px-2 py-3">Stato</th>
                <th className="px-2 py-3">Prep. (min)</th>
                <th className="px-2 py-3">Inizio</th>
                <th className="px-2 py-3">Pausa</th>
                <th className="px-2 py-3">2° Inizio</th>
                <th className="px-2 py-3">Fine</th>
                <th className="px-2 py-3">Totale (min)</th>
                <th className="px-2 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <TaglioLaserRow 
                  key={item.id} 
                  item={item} 
                  isOsvaldo={isOsvaldo} 
                  isRida={isRida}
                  isDeveloper={isDeveloper}
                  onUpdateRow={async (id, data) => {
                    try {
                      await updateTaglioLaser(id, data);
                      toast.success('Riga aggiornata');
                      loadData(true);
                    } catch (error: any) {
                      toast.error('Errore: ' + error.message);
                    }
                  }}
                  onStart={(prep) => {
                    handleStart(item, prep);
                  }}
                  onPause={() => handlePause(item)}
                  onResume={() => handleResume(item)}
                  onComplete={(prep, fine) => {
                    setConfirmingItem(item);
                    setConfirmedQty(item.quantita);
                    setTempPrep(prep);
                    setTempFine(fine);
                  }}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    Nessun programma trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal di conferma quantità */}
      {confirmingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
                Conferma Quantità Tagliata
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                L'articolo <span className="font-bold text-slate-700">{confirmingItem.articolo}</span> è stato completato.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Quantità Prevista: <span className="text-slate-900">{confirmingItem.quantita}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    value={confirmedQty}
                    onChange={(e) => setConfirmedQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                    placeholder="Inserisci quantità effettiva..."
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">
                  * Inserisci la quantità effettivamente tagliata (potrebbe essere diversa da quella prevista).
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => {
                  setConfirmingItem(null);
                  setConfirmedQty('');
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (confirmedQty === '' || Number(confirmedQty) < 0) {
                    toast.error('Inserisci una quantità valida');
                    return;
                  }
                  handleComplete(confirmingItem, tempPrep, tempFine, Number(confirmedQty));
                  setConfirmingItem(null);
                  setConfirmedQty('');
                }}
                className="flex-[2] bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                Conferma e Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaglioLaserRow({ 
  item, 
  isOsvaldo, 
  isRida,
  onStart, 
  onPause,
  onResume,
  onComplete, 
  onDelete,
  isDeveloper,
  onUpdateRow
}: { 
  item: TaglioLaserType; 
  isOsvaldo: boolean;
  isRida: boolean;
  onStart: (prep: number) => void; 
  onPause: () => void;
  onResume: () => void;
  onComplete: (prep: number, fine: string) => void;
  onDelete: () => void;
  isDeveloper: boolean;
  onUpdateRow: (id: string, data: Partial<TaglioLaserType>) => Promise<void>;
}) {
  const [prep, setPrep] = useState<number | ''>(item.preparazione || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TaglioLaserType>>({});

  const isDaTagliare = item.stato === 'da tagliare';
  const isInLavorazione = item.stato === 'in lavorazione';
  const isPausa = item.stato === 'in pausa';
  const isCompletato = item.stato === 'completato';

  const formatTimeStr = (iso: string | null) => {
    if (!iso) return '-';
    if (iso.includes(':') && !iso.includes('T')) return iso;
    try {
      return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return iso;
    }
  };

  const handleStartEdit = () => {
    setEditData({ ...item });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await onUpdateRow(item.id, editData);
    setIsEditing(false);
  };

  if (isEditing && isDeveloper) {
    return (
      <tr className="bg-blue-50">
        <td className="px-2 py-3"><input type="date" className="w-full text-xs border rounded px-1" value={editData.data || ''} onChange={e => setEditData({...editData, data: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.cliente || ''} onChange={e => setEditData({...editData, cliente: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.commessa || ''} onChange={e => setEditData({...editData, commessa: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.articolo || ''} onChange={e => setEditData({...editData, articolo: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="number" className="w-full text-xs border rounded px-1" value={editData.quantita || ''} onChange={e => setEditData({...editData, quantita: Number(e.target.value)})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.odl || ''} onChange={e => setEditData({...editData, odl: e.target.value})} /></td>
        <td className="px-2 py-3">
          <select className="w-full text-xs border rounded px-1" value={editData.stato || ''} onChange={e => setEditData({...editData, stato: e.target.value as any})}>
            <option value="da tagliare">Lanciato</option>
            <option value="in lavorazione">In lavorazione</option>
            <option value="in pausa">In pausa</option>
            <option value="completato">Completato</option>
          </select>
        </td>
        <td className="px-2 py-3"><input type="number" className="w-full text-xs border rounded px-1" value={editData.preparazione || 0} onChange={e => setEditData({...editData, preparazione: Number(e.target.value)})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.inizio || ''} onChange={e => setEditData({...editData, inizio: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.pausa || ''} onChange={e => setEditData({...editData, pausa: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.inizio2 || ''} onChange={e => setEditData({...editData, inizio2: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="text" className="w-full text-xs border rounded px-1" value={editData.fine || ''} onChange={e => setEditData({...editData, fine: e.target.value})} /></td>
        <td className="px-2 py-3"><input type="number" className="w-full text-xs border rounded px-1" value={editData.totale_tempo || 0} onChange={e => setEditData({...editData, totale_tempo: Number(e.target.value)})} /></td>
        <td className="px-2 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={clsx(
      "hover:bg-slate-50 transition-colors",
      isCompletato ? "bg-emerald-50/30" : isInLavorazione ? "bg-amber-50/30" : isPausa ? "bg-red-50/30" : ""
    )}>
      <td className="px-2 py-3 whitespace-nowrap">{item.data && !isNaN(new Date(item.data).getTime()) ? new Date(item.data).toLocaleDateString('it-IT') : '-'}</td>
      <td className="px-2 py-3 text-slate-600">{item.cliente || '-'}</td>
      <td className="px-2 py-3 text-slate-600">{item.commessa || '-'}</td>
      <td className="px-2 py-3 font-medium text-slate-800">{item.articolo}</td>
      <td className="px-2 py-3">
        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-xs">
          {item.quantita}
        </span>
      </td>
      <td className="px-2 py-3 text-slate-500">{item.odl || '-'}</td>
      <td className="px-2 py-3">
        <span className={clsx(
          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
          isDaTagliare && "bg-slate-100 text-slate-600",
          isInLavorazione && "bg-amber-100 text-amber-700",
          isPausa && "bg-red-100 text-red-700",
          isCompletato && "bg-emerald-100 text-emerald-700"
        )}>
          {item.stato === 'da tagliare' ? 'Lanciato' : item.stato}
        </span>
      </td>
      <td className="px-2 py-3">
        <input 
          type="number" 
          min="0"
          value={prep}
          onChange={(e) => setPrep(e.target.value === '' ? '' : Number(e.target.value))}
          className="border border-slate-300 rounded px-2 py-1 text-xs w-16 focus:ring-1 focus:ring-indigo-500 outline-none"
          placeholder="Min."
          disabled={!isDaTagliare && !isPausa}
        />
      </td>
      <td className="px-2 py-3 font-mono text-xs">{formatTimeStr(item.inizio)}</td>
      <td className="px-2 py-3 font-mono text-xs text-red-600 font-bold">{formatTimeStr(item.pausa)}</td>
      <td className="px-2 py-3 font-mono text-xs text-indigo-600 font-bold">{formatTimeStr(item.inizio2)}</td>
      <td className="px-2 py-3 font-mono text-xs">{formatTimeStr(item.fine)}</td>
      <td className="px-2 py-3 font-bold text-slate-700">
        {item.totale_tempo ? `${item.totale_tempo}'` : '-'}
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {isDaTagliare && isOsvaldo && (
            <button 
              onClick={() => {
                if (prep === '' || prep === 0) {
                  toast.error('Inserisci la preparazione');
                  return;
                }
                onStart(Number(prep));
              }}
              className="bg-amber-500 text-white p-1.5 rounded hover:bg-amber-600 transition-colors"
              title="Inizia Lavorazione"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          
          {isPausa && isOsvaldo && (
            <button 
              onClick={() => onResume()}
              className="bg-indigo-500 text-white p-1.5 rounded hover:bg-indigo-600 transition-colors"
              title="Riprendi Lavorazione"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {isInLavorazione && isOsvaldo && (
            <button 
              onClick={() => onPause()}
              className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600 transition-colors"
              title="Pausa"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {isInLavorazione && isOsvaldo && (
            <button 
              onClick={() => {
                const now = new Date().toISOString();
                onComplete(Number(prep) || 0, now);
              }}
              className="bg-emerald-500 text-white p-1.5 rounded hover:bg-emerald-600 transition-colors"
              title="Completa Lavorazione"
            >
              <Square className="w-4 h-4" />
            </button>
          )}

          {isRida && isDaTagliare && (
            <button 
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
              title="Elimina"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isDeveloper && (
            <button 
              onClick={handleStartEdit}
              className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition-colors"
              title="Modifica riga"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

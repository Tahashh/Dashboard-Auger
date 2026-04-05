import React, { useState, useEffect } from 'react';
import { Article, Client, AUTHORIZED_USERS } from '../types';
import { Plus, Package, Trash2, AlertCircle } from 'lucide-react';
import { getDisponibilita, getCategory, isPhaseEnabled, getPhaseAvailability } from '../utils';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { fetchClients, updateArticle, addCommitment, fetchProcesses, fetchCommitments, fetchCasseComplete } from '../api';
import { Process, Commitment } from '../types';

interface RegisterCommitmentProps {
  articles: Article[];
  onUpdate: () => void;
  username: string;
}

export default function RegisterCommitment({ articles, onUpdate, username }: RegisterCommitmentProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [casseComplete, setCasseComplete] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [rows, setRows] = useState<{ articoloId: string; quantita: number | '' }[]>([{ articoloId: '', quantita: '' }]);
  const [cliente, setCliente] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [commessa, setCommessa] = useState('');
  const [mese, setMese] = useState('');
  const mesi = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];

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

  const filteredClients = clients.filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase()));

  const handleClientSelect = (nome: string) => {
    setCliente(nome);
    setClientSearch(nome);
    setShowClientDropdown(false);
  };
  const [faseProduzione, setFaseProduzione] = useState('Verniciatura');
  const [priorita, setPriorita] = useState(0);
  const [note, setNote] = useState('');

  const getPrioritaLabel = (p: number) => {
    if (p === 0) return "Nessuna priorità";
    if (p <= 3) return "Bassa";
    if (p <= 6) return "Media";
    if (p <= 9) return "Alta";
    return "Urgente";
  };

  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const selectedArticles = rows
    .map(r => articles.find(a => a.id === r.articoloId || a.codice === r.articoloId))
    .filter(Boolean) as Article[];

  const availablePhases = ['Taglio', 'Piega', 'Saldatura', 'Verniciatura', 'Grezzo'].filter(phase => {
    if (selectedArticles.length === 0) return true;
    return selectedArticles.every(a => isPhaseEnabled(getCategory(a.nome, a.codice), phase));
  });

  // If current phase is not available, reset to Verniciatura or Piega
  useEffect(() => {
    if (!availablePhases.includes(faseProduzione) && availablePhases.length > 0) {
      if (selectedArticles.some(a => a.nome.toLowerCase().includes('piastra'))) {
        setFaseProduzione(availablePhases.includes('Piega') ? 'Piega' : availablePhases[0]);
      } else {
        setFaseProduzione(availablePhases.includes('Verniciatura') ? 'Verniciatura' : availablePhases[0]);
      }
    }
  }, [selectedArticles, faseProduzione, availablePhases]);

  const loadData = async () => {
    try {
      const [clientsData, processesData, commitmentsData, casseCompleteData] = await Promise.all([
        fetchClients(),
        fetchProcesses(),
        fetchCommitments(),
        fetchCasseComplete()
      ]);
      setClients(clientsData);
      setProcesses(processesData);
      setCommitments(commitmentsData);
      setCasseComplete(casseCompleteData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter(r => r.articoloId && r.quantita);
    if (!isAuthorized || validRows.length === 0 || !cliente || !commessa) return;

    // Validate custom codes and Casse Complete stock
    const itemsToSend: any[] = [];
    for (const row of validRows) {
      const article = articles.find(a => a.codice === row.articoloId || a.id === row.articoloId);
      const cassaCompleta = casseComplete.find(c => c.articolo === row.articoloId);
      const reqQty = parseInt(row.quantita.toString());

      if (cassaCompleta) {
        if (reqQty > cassaCompleta.totale) {
          toast.error(`Disponibilità insufficiente per ${cassaCompleta.articolo}. Richiesti: ${reqQty}, Disponibili: ${cassaCompleta.totale}`);
          return;
        }
        itemsToSend.push({
          is_cassa_completa: true,
          cassa_id: cassaCompleta.id,
          codice_articolo: cassaCompleta.articolo,
          quantita: reqQty
        });
      } else if (article) {
        const cat = getCategory(article.nome || '', article.codice || '');
        const isCassaCompleta = cat === 'INVOLUCRI AT' || cat === 'Strutture Agr';
        
        if (isCassaCompleta) {
          if (faseProduzione !== 'Saldatura' && faseProduzione !== 'Verniciatura') {
            toast.error(`Non è possibile impegnare casse complete (${article.codice}) nello stato ${faseProduzione}. Sono consentiti solo gli stati Saldato (SALD.) e Verniciato (VER.).`);
            return;
          }
          
          const process = processes.find(p => p.articolo_id === article.id);
          const available = getPhaseAvailability(article, process, faseProduzione, commitments);
          
          if (reqQty > available) {
            toast.error(`Disponibilità insufficiente per ${article.codice} in fase ${faseProduzione}. Richiesti: ${reqQty}, Disponibili: ${available}`);
            return;
          }
        }

        itemsToSend.push({
          articolo_id: article.id,
          quantita: reqQty
        });
      } else {
        const upperCode = row.articoloId.toUpperCase();
        if (upperCode.endsWith('-PVR') || upperCode.endsWith('-SPC')) {
          itemsToSend.push({
            codice_articolo: upperCode,
            quantita: parseInt(row.quantita.toString())
          });
        } else {
          toast.error(`L'articolo "${row.articoloId}" non esiste e non è una commessa speciale (-PVR o -SPC).`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      const batchItems = itemsToSend.map(item => {
        let articolo_nome = '';
        let articolo_codice = item.codice_articolo || '';

        if (item.articolo_id) {
          const article = articles.find(a => a.id === item.articolo_id);
          if (article) {
            articolo_nome = article.nome;
            articolo_codice = article.codice;
          }
        } else if (item.is_cassa_completa) {
          articolo_nome = item.codice_articolo;
        } else {
          articolo_nome = `Commessa Speciale: ${articolo_codice}`;
        }
        
        return {
          ...item,
          articolo_codice,
          articolo_nome
        };
      });

      await fetch('/api/commitments/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: batchItems,
          cliente,
          commessa,
          priorita,
          fase_produzione: faseProduzione,
          note: mese ? (note ? `${mese} - ${note}` : mese) : note,
          stato_lavorazione: 'Pianificato',
          operatore: username
        })
      });

      toast.success('Impegni registrati con successo!');
      
      // Reset form
      setRows([{ articoloId: '', quantita: '' }]);
      setCliente('');
      setClientSearch('');
      setCommessa('');
      setMese('');
      setPriorita(0);
      setFaseProduzione('Verniciatura');
      setNote('');
      
      onUpdate();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Errore nella registrazione degli impegni');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 flex flex-col h-full transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
          <Package className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registra Impegni Multipli</h2>
      </div>

      {!isAuthorized ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm">
          Non hai i permessi necessari per aggiungere nuovi impegni.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente (Ragione Sociale)</label>
              {clients.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  Nessun cliente registrato.
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setCliente(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    placeholder="Cerca cliente..."
                    required
                  />
                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map(c => (
                          <div
                            key={c.id}
                            className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer"
                            onMouseDown={() => handleClientSelect(c.nome)}
                          >
                            {c.nome}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-500">Nessun cliente trovato</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Commessa</label>
              <input 
                type="text" 
                value={commessa}
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
                  setCommessa(val);
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                placeholder="Es. C.1234"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mese Riferimento (Opzionale)</label>
              <select 
                value={mese}
                onChange={(e) => setMese(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">Nessun Mese</option>
                {mesi.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fase Produzione</label>
              <select 
                value={faseProduzione}
                onChange={(e) => setFaseProduzione(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="Verniciatura" disabled={!availablePhases.includes('Verniciatura')}>Verniciatura</option>
                <option value="Saldatura" disabled={!availablePhases.includes('Saldatura')}>Saldatura</option>
                <option value="Piega" disabled={!availablePhases.includes('Piega')}>Piega (Gre.)</option>
                <option value="Taglio" disabled={!availablePhases.includes('Taglio')}>Taglio</option>
              </select>
              {!availablePhases.includes(faseProduzione) && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Fase non disponibile per gli articoli selezionati
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note Aggiuntive</label>
              <input 
                type="text" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                placeholder="Altre note..."
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[180px] border border-slate-100 rounded-lg p-1.5 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <h3 className="text-sm font-semibold text-slate-600">Articoli da Impegnare</h3>
              <button 
                type="button"
                onClick={addRow}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Aggiungi Riga
              </button>
            </div>
            
            {rows.map((row, index) => {
              const article = articles.find(a => a.codice === row.articoloId || a.id === row.articoloId);
              const cassaCompleta = casseComplete.find(c => c.articolo === row.articoloId);
              let availableInfo = null;
              
              if (cassaCompleta) {
                availableInfo = (
                  <span className={clsx(
                    "text-[9px] font-bold ml-2",
                    cassaCompleta.totale > 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    (Disp: {cassaCompleta.totale})
                  </span>
                );
              } else if (article) {
                const cat = getCategory(article.nome || '', article.codice || '');
                if (cat === 'INVOLUCRI AT' || cat === 'Strutture Agr') {
                  const process = processes.find(p => p.articolo_id === article.id);
                  const available = getPhaseAvailability(article, process, faseProduzione, commitments);
                  availableInfo = (
                    <span className={clsx(
                      "text-[9px] font-bold ml-2",
                      available > 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      (Disp: {available})
                    </span>
                  );
                }
              }

              return (
              <div key={index} className="flex gap-2 mb-1.5 items-end bg-white p-1.5 rounded border border-slate-200 shadow-sm">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">
                    Articolo {availableInfo}
                  </label>
                  <input 
                    list="articles-list"
                    value={row.articoloId}
                    onChange={(e) => updateRow(index, 'articoloId', e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-slate-900 outline-none"
                    placeholder="Codice articolo (es. 1234-PVR)"
                    required
                  />
                  <datalist id="articles-list">
                    {articles.map(a => (
                      <option key={a.id} value={a.codice}>{a.nome}</option>
                    ))}
                    {casseComplete.map(c => (
                      <option key={`cc-${c.id}`} value={c.articolo}>{c.articolo}</option>
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
            )})}
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              Priorità Cliente
              <span className={clsx(
                "px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold",
                priorita === 0 ? "bg-slate-200 text-slate-600" :
                priorita <= 3 ? "bg-blue-100 text-blue-700" :
                priorita <= 6 ? "bg-amber-100 text-amber-700" :
                priorita <= 9 ? "bg-orange-100 text-orange-700" :
                "bg-red-100 text-red-700 animate-pulse"
              )}>
                {getPrioritaLabel(priorita)}
              </span>
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1" 
                value={priorita}
                onChange={(e) => setPriorita(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <input 
                type="number" 
                min="0" 
                max="10" 
                value={priorita}
                onChange={(e) => setPriorita(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-center font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none text-sm"
              />
            </div>
          </div>

          <div className="mt-2">
            <button
              type="submit"
              disabled={loading || rows.filter(r => r.articoloId && r.quantita).length === 0 || !cliente || !commessa}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Elaborazione...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Registra Impegni ({rows.filter(r => r.articoloId && r.quantita).length})
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Commitment, AUTHORIZED_USERS } from '../types';
import { CheckCircle2, Package, ListOrdered, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CommitmentPriorityManager from './CommitmentPriorityManager';
import ConfirmModal from './ConfirmModal';
import { fetchCommitments, fetchArticles, fetchProcesses, updateArticle, updateProcess, updateCommitment, addMovementLog, shipCommitment } from '../api';

interface CommitmentsViewProps {
  onUpdate: () => void;
  username: string;
}

export default function CommitmentsView({ onUpdate, username }: CommitmentsViewProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPriorityManager, setShowPriorityManager] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const loadCommitments = async () => {
    try {
      const data = await fetchCommitments();
      setCommitments(data);
    } catch (error) {
      console.error("Error fetching commitments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommitments();
    const interval = setInterval(loadCommitments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFulfill = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Conferma Evasione',
      message: 'Sei sicuro di voler evadere questo impegno? I pezzi verranno scalati dalla disponibilità.',
      onConfirm: async () => {
        try {
          const commitment = commitments.find(c => c.id === id);
          
          if (!commitment) {
            throw new Error("Impegno non trovato");
          }
          
          if (commitment.stato_lavorazione === 'Completato') {
            throw new Error("Impegno già evaso");
          }

          const qty = commitment.quantita;
          const articolo_id = commitment.articolo_id;

          const allArticles = await fetchArticles();
          const article = allArticles.find(a => a.id === articolo_id);
          
          if (!article) {
            throw new Error("Articolo non trovato");
          }
          
          const isPiastra = article.nome.toLowerCase().includes('piastra');
          
          const allProcesses = await fetchProcesses();
          const process = allProcesses.find(p => p.articolo_id === articolo_id);

          const fase = commitment.fase_produzione?.toLowerCase() || 'generico';

          if (fase === 'taglio') {
            const taglioDisp = process ? (process.taglio || 0) : 0;
            if (taglioDisp < qty) {
              throw new Error(`Impossibile evadere: pezzi non sufficientemente tagliati (Disponibili: ${taglioDisp}, Richiesti: ${qty})`);
            }
            if (process) {
              await updateProcess(process.id, {
                taglio: Math.max(0, (process.taglio || 0) - qty)
              });
            }
          } else if (fase === 'piega') {
            const piegaDisp = process ? (process.piega || 0) : 0;
            if (piegaDisp < qty) {
              throw new Error(`Impossibile evadere: pezzi non sufficientemente piegati (Disponibili: ${piegaDisp}, Richiesti: ${qty})`);
            }
            await updateArticle(articolo_id, {
              piega: Math.max(0, (article.piega || 0) - qty)
            });
            if (process) {
              await updateProcess(process.id, {
                piega: Math.max(0, (process.piega || 0) - qty)
              });
            }
          } else if (fase === 'saldatura') {
            const saldaturaDisp = process ? (process.saldatura || 0) : 0;
            if (saldaturaDisp < qty) {
              throw new Error(`Impossibile evadere: pezzi non sufficientemente saldati (Disponibili: ${saldaturaDisp}, Richiesti: ${qty})`);
            }
            if (process) {
              await updateProcess(process.id, {
                saldatura: Math.max(0, (process.saldatura || 0) - qty)
              });
            }
          } else if (fase === 'verniciatura') {
            const verniciatiDisp = article.verniciati || 0;
            if (verniciatiDisp < qty) {
              throw new Error(`Impossibile evadere: pezzi non sufficientemente verniciati (Disponibili: ${verniciatiDisp}, Richiesti: ${qty})`);
            }
            await updateArticle(articolo_id, {
              verniciati: Math.max(0, (article.verniciati || 0) - qty)
            });
            if (process) {
              await updateProcess(process.id, {
                verniciatura: Math.max(0, (process.verniciatura || 0) - qty)
              });
            }
          } else {
            // Generico
            const isPiastra = article.nome.toLowerCase().includes('piastra');
            if (isPiastra) {
              const piegaDisp = process ? (process.piega || 0) : 0;
              if (piegaDisp < qty) {
                throw new Error(`Impossibile evadere: le piastre non sono sufficientemente piegate (Disponibili: ${piegaDisp}, Richieste: ${qty})`);
              }
              
              await updateArticle(articolo_id, {
                piega: Math.max(0, (article.piega || 0) - qty)
              });

              if (process) {
                await updateProcess(process.id, {
                  piega: Math.max(0, (process.piega || 0) - qty)
                });
              }
            } else {
              const verniciatiDisp = article.verniciati || 0;
              if (verniciatiDisp < qty) {
                throw new Error(`Impossibile evadere: i pezzi non sono sufficientemente verniciati (Disponibili: ${verniciatiDisp}, Richiesti: ${qty})`);
              }
              
              await updateArticle(articolo_id, {
                verniciati: Math.max(0, (article.verniciati || 0) - qty)
              });

              if (process) {
                await updateProcess(process.id, {
                  verniciatura: Math.max(0, (process.verniciatura || 0) - qty)
                });
              }
            }
          }

          // Update impegni_clienti
          await updateArticle(articolo_id, {
            impegni_clienti: Math.max(0, (article.impegni_clienti || 0) - qty)
          });

          await updateCommitment(id, {
            stato_lavorazione: 'Completato',
            timestamp_modifica: new Date().toISOString()
          });
          
          await addMovementLog({
            articolo_id: articolo_id,
            articolo_nome: article.nome,
            articolo_codice: article.codice,
            fase: 'scarico commessa',
            tipo: 'scarico',
            quantita: qty,
            operatore: username || 'System',
            cliente: commitment.cliente,
            commessa: commitment.commessa,
            timestamp: new Date().toISOString()
          });
          
          toast.success('Impegno evaso con successo!');
          loadCommitments();
          onUpdate();
        } catch (error: any) {
          toast.error(error.message, { duration: 5000 });
          console.error("Error fulfilling commitment:", error);
        }
      }
    });
  };

  const handleShip = async (id: string) => {
    if (username.toLowerCase() !== 'samantalimonta') {
      toast.error('Utente non autorizzato. Solo SamantaLimonta può segnare le commesse come evase/spedite.', {
        duration: 5000,
        icon: '🛑'
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Conferma Spedizione',
      message: 'Sei sicuro di voler segnare questa commessa come spedita? Verrà rimossa dalla lista.',
      onConfirm: async () => {
        try {
          await shipCommitment(id, username);
          toast.success('Commessa spedita con successo!');
          loadCommitments();
          onUpdate();
        } catch (error: any) {
          toast.error(error.message, { duration: 5000 });
          console.error("Error shipping commitment:", error);
        }
      }
    });
  };

  const formatDate = (dateString: string) => {
    // Append 'Z' to treat SQLite's UTC timestamp correctly
    const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Rome'
    }).format(date);
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
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
            Totale: {commitments.length}
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="overflow-x-auto flex-1 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        ) : commitments.length === 0 ? (
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
                {(isAuthorized || username.toLowerCase() === 'samantalimonta') && <th className="px-4 py-3 font-semibold text-center">Azioni</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commitments.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDate(c.data_inserimento)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.cliente}</div>
                    <div className="text-xs text-slate-500 font-mono">{c.commessa}</div>
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
                    {c.note && (
                      <div className="text-xs text-slate-500 italic max-w-[150px] truncate" title={c.note}>
                        {c.note}
                      </div>
                    )}
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
                  {(isAuthorized || username.toLowerCase() === 'samantalimonta') && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isAuthorized && c.stato_lavorazione !== 'Completato' && (
                          <button
                            onClick={() => handleFulfill(c.id)}
                            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            title="Segna come pronto per la consegna (scala pezzi)"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Pronto
                          </button>
                        )}
                        {username.toLowerCase() === 'samantalimonta' && c.stato_lavorazione === 'Completato' && (
                          <button
                            onClick={() => handleShip(c.id)}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            title="Segna come spedito (rimuove dalla lista)"
                          >
                            <Truck className="h-4 w-4" />
                            Spedisci
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

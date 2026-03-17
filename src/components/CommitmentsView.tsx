import { useState, useEffect } from 'react';
import { Commitment, AUTHORIZED_USERS } from '../types';
import { CheckCircle2, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CommitmentsViewProps {
  onUpdate: () => void;
  username: string;
}

export default function CommitmentsView({ onUpdate, username }: CommitmentsViewProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isAuthorized = AUTHORIZED_USERS.includes(username);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/commitments');
      const data = await res.json();
      setCommitments(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFulfill = async (id: number) => {
    if (!confirm('Sei sicuro di voler evadere questo impegno? I pezzi verranno scalati dalla disponibilità.')) return;
    
    try {
      const res = await fetch(`/api/commitments/${id}/fulfill`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Errore durante l\'evasione');
      }
      
      toast.success('Impegno evaso con successo!');
      fetchData();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message, { duration: 5000 });
      console.error("Error fulfilling commitment:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-slate-200 p-2 rounded-lg">
            <Package className="h-5 w-5 text-slate-600" />
          </div>
          <h2 className="font-bold text-slate-800">Elenco Impegni Attivi</h2>
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Totale: {commitments.length}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-600 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Cliente / Commessa</th>
                <th className="px-4 py-3 font-semibold">Articolo</th>
                <th className="px-4 py-3 font-semibold">Fase / Stato</th>
                <th className="px-4 py-3 font-semibold text-center">Q.tà</th>
                {isAuthorized && <th className="px-4 py-3 font-semibold text-center">Azioni</th>}
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
                    <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-sm font-bold">
                      {c.quantita}
                    </span>
                  </td>
                  {isAuthorized && (
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleFulfill(c.id)}
                        className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                        title="Evadi impegno (scala pezzi)"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Evadi
                      </button>
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

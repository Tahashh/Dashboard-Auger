import { useState, useEffect } from 'react';
import { AlertCircle, X, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiCall } from '../api';

interface ProductionAlert {
  id: number;
  tipo: string;
  articolo: string;
  quantita: number;
  cliente: string;
  commessa: string;
  azione_richiesta: string;
  stato: string;
  created_at: string;
}

interface ProductionAlertsProps {
  username: string;
}

export default function ProductionAlerts({ username }: ProductionAlertsProps) {
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const isAuthorized = ['LucaTurati', 'RobertoBonalumi', 'TahaDev'].includes(username);

  const fetchAlerts = async () => {
    try {
      const data = await apiCall<ProductionAlert[]>('/api/production-alerts');
      setAlerts(data);
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      // Only show toast if it's not a background poll or if it's a critical error
      if (error.message && !error.message.includes('AbortError')) {
        // We don't want to spam the user with toasts for background polls
        // but we log it to console.
      }
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchAlerts();
      const interval = setInterval(fetchAlerts, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthorized]);

  const handleDismiss = async (id: number) => {
    try {
      await apiCall(`/api/production-alerts/${id}/dismiss`, { method: 'POST' });
      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Promemoria posticipato');
    } catch (error) {
      toast.error('Errore durante l\'operazione');
    }
  };

  if (!isAuthorized || alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 max-w-md w-full animate-in slide-in-from-right duration-500">
      {alerts.map((alert) => (
        <div 
          key={alert.id} 
          className="bg-white border-l-4 border-amber-500 rounded-xl shadow-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-2">
            <button 
              onClick={() => handleDismiss(alert.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Ricorda più tardi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-amber-100 p-2 rounded-lg shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                Azione Richiesta: {alert.azione_richiesta}
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                Componente disponibile in fase Grezzo/Saldatura ma necessario Verniciato.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-slate-500 font-medium">Articolo:</span>
              <span className="text-slate-900 font-bold">{alert.articolo}</span>
              
              <span className="text-slate-500 font-medium">Quantità:</span>
              <span className="text-slate-900 font-bold">{alert.quantita} pz</span>
              
              <span className="text-slate-500 font-medium">Cliente:</span>
              <span className="text-slate-900">{alert.cliente || '-'}</span>
              
              <span className="text-slate-500 font-medium">Commessa:</span>
              <span className="text-slate-900">{alert.commessa || '-'}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            <button 
              onClick={() => handleDismiss(alert.id)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Clock className="h-4 w-4" /> Ricorda più tardi
            </button>
            <div className="flex-1 bg-amber-50 text-amber-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs border border-amber-100 italic">
              In attesa di registrazione movimento
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

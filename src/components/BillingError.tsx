import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';

export default function BillingError() {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border-t-4 border-red-600 animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
            Servizio Sospeso
          </h1>
          
          <p className="text-slate-600 mb-8 leading-relaxed">
            L'applicazione è attualmente in stato di Sospensione Servizio.
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 text-left">
            <div className="flex items-center gap-3 text-slate-700 font-bold mb-2">
              <CreditCard className="w-5 h-5" />
              <span>Dettagli Errore:</span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Error Code: <span className="text-red-600 font-bold">PAYMENT_REQUIRED_0426</span><br />
              Status: <span className="text-red-600 font-bold">Fattura Scaduta</span><br />
              Data: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>
          
          <div className="space-y-3">
            <a 
              href="https://console.cloud.google.com/billing/01AC2F-FD1C4A-5CE127/payment?project=dashboard-auger"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              Riprova Pagamento
            </a>
            
            <a 
              href="mailto:fondatore@investortahashh10.com" 
              className="w-full inline-flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              Contatta l'amministrazione <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
        
        <div className="bg-slate-100 px-8 py-4 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Dashboard Auger - Sistemi Gestionali Interni
          </p>
        </div>
      </div>
    </div>
  );
}

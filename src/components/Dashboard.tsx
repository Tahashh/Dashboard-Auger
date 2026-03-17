import { useState, useEffect, useRef } from 'react';
import { LogOut, LayoutDashboard, Menu, Package, Activity, Users, History, BellRing, UploadCloud, Grid } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import ArticlesTable from './ArticlesTable';
import ProcessesTable from './ProcessesTable';
import CommitmentsTable from './CommitmentsTable';
import ProductionMovement from './ProductionMovement';
import RegisterCommitment from './RegisterCommitment';
import CommitmentsView from './CommitmentsView';
import ClientsView from './ClientsView';
import MovementsView from './MovementsView';
import ImportDataView from './ImportDataView';
import Produzione2026View from './Produzione2026View';
import { Article, Process, Commitment } from '../types';
import { getDisponibilita } from '../utils';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export default function Dashboard({ username, onLogout }: DashboardProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'produzione2026' | 'impegni' | 'clienti' | 'movimenti' | 'import'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  
  const prevArticlesRef = useRef<Article[]>([]);
  const prevCommitmentsCountRef = useRef<number>(0);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notifiche desktop attivate con successo!');
      } else {
        toast.error('Permesso per le notifiche negato.');
      }
    }
  };

  const fetchData = async () => {
    try {
      const [articlesRes, processesRes, commitmentsRes] = await Promise.all([
        fetch('/api/articles'),
        fetch('/api/processes'),
        fetch('/api/commitments')
      ]);
      
      const articlesData: Article[] = await articlesRes.json();
      const processesData: Process[] = await processesRes.json();
      const commitmentsData = await commitmentsRes.json();
      
      // Check for low availability
      if (prevArticlesRef.current.length > 0) {
        articlesData.forEach(newArticle => {
          const oldArticle = prevArticlesRef.current.find(a => a.id === newArticle.id);
          if (oldArticle) {
            const oldDisp = getDisponibilita(oldArticle);
            const newDisp = getDisponibilita(newArticle);
            
            // Se la disponibilità scende sotto i 10 pezzi
            if (oldDisp >= 10 && newDisp < 10) {
              const process = processesData.find(p => p.articolo_id === newArticle.id);
              
              const isPiastra = newArticle.nome.toLowerCase().includes('piastra');
              const deficit = 10 - newDisp; // Calcola quanti pezzi mancano per tornare alla scorta di sicurezza (10)
              const taglio = process?.taglio || 0;
              const piega = process?.piega || 0;
              
              let action = 'tagliare';
              if (isPiastra) {
                if (taglio >= deficit) action = 'piegare';
              } else {
                if (piega >= deficit) action = 'verniciare';
                else if (taglio >= deficit) action = 'piegare';
              }

              const message = `Disponibilità: ${newDisp} pz per ${newArticle.nome}. Necessario: ${action.toUpperCase()}`;
              
              toast.error(message, {
                duration: 8000,
                icon: '⚠️',
              });

              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Sotto Scorta - Auger", {
                  body: message,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        });
      }
      
      // Check for new commitments
      if (prevCommitmentsCountRef.current > 0 && commitmentsData.length > prevCommitmentsCountRef.current) {
        const newCommitmentsCount = commitmentsData.length - prevCommitmentsCountRef.current;
        const msg = `${newCommitmentsCount} nuov${newCommitmentsCount === 1 ? 'o impegno registrato' : 'i impegni registrati'}!`;
        
        toast.success(msg, {
          duration: 4000,
          icon: '📦',
        });

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Nuovo Impegno - Auger", {
            body: msg,
            icon: '/favicon.ico'
          });
        }
      }
      
      prevArticlesRef.current = articlesData;
      prevCommitmentsCountRef.current = commitmentsData.length;
      
      setArticles(articlesData);
      setProcesses(processesData);
      setCommitments(commitmentsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleArticleUpdate = () => {
    fetchData();
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Panoramica Produzione';
      case 'produzione2026': return 'Produzione 2026';
      case 'impegni': return 'Gestione Impegni';
      case 'clienti': return 'Anagrafica Clienti';
      case 'movimenti': return 'Cronologia Movimenti';
      case 'import': return 'Importazione Dati';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Toaster position="top-right" />
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md relative z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <Menu className="h-6 w-6 text-slate-300" />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">DASHBOARD AUGER</h1>
                <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                  {getViewTitle()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {notificationPermission === 'default' && (
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-800 border border-amber-500/30"
              >
                <BellRing className="h-4 w-4" />
                <span className="hidden sm:inline">Attiva Notifiche</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <span className="text-sm font-bold text-emerald-400">{username.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm font-medium text-slate-300 hidden sm:inline">Utente loggato: <span className="text-white">{username}</span></span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-16 left-0 w-64 bg-slate-800 shadow-xl border-t border-slate-700 py-2 rounded-br-xl">
            <button
              onClick={() => { setCurrentView('dashboard'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'dashboard' ? 'bg-slate-700 text-white border-l-4 border-emerald-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <Activity className="h-5 w-5" />
              <span className="font-medium">Panoramica Produzione</span>
            </button>
            <button
              onClick={() => { setCurrentView('produzione2026'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'produzione2026' ? 'bg-slate-700 text-white border-l-4 border-cyan-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <Grid className="h-5 w-5" />
              <span className="font-medium">Produzione 2026</span>
            </button>
            <button
              onClick={() => { setCurrentView('impegni'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'impegni' ? 'bg-slate-700 text-white border-l-4 border-indigo-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <Package className="h-5 w-5" />
              <span className="font-medium">Tabella Impegni</span>
            </button>
            <button
              onClick={() => { setCurrentView('clienti'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'clienti' ? 'bg-slate-700 text-white border-l-4 border-blue-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <Users className="h-5 w-5" />
              <span className="font-medium">Clienti</span>
            </button>
            <button
              onClick={() => { setCurrentView('movimenti'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'movimenti' ? 'bg-slate-700 text-white border-l-4 border-orange-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <History className="h-5 w-5" />
              <span className="font-medium">Movimenti</span>
            </button>
            <div className="border-t border-slate-700 my-1"></div>
            <button
              onClick={() => { setCurrentView('import'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors ${currentView === 'import' ? 'bg-slate-700 text-white border-l-4 border-purple-500' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-4 border-transparent'}`}
            >
              <UploadCloud className="h-5 w-5" />
              <span className="font-medium">Importa Dati</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6" onClick={() => menuOpen && setMenuOpen(false)}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : currentView === 'dashboard' ? (
          <>
            {/* Top Section: Operational Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProductionMovement articles={articles} onUpdate={handleArticleUpdate} username={username} />
              <RegisterCommitment articles={articles} onUpdate={handleArticleUpdate} username={username} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" style={{ height: 'calc(100vh - 450px)', minHeight: '500px' }}>
              {/* Left Column: Articles (5 columns) */}
              <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <ArticlesTable articles={articles} commitments={commitments} processes={processes} onUpdate={handleArticleUpdate} />
              </div>

              {/* Center Column: Processes (4 columns) */}
              <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <ProcessesTable processes={processes} onUpdate={handleArticleUpdate} />
              </div>

              {/* Right Column: Commitments (3 columns) */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <CommitmentsTable articles={articles} onUpdate={handleArticleUpdate} username={username} />
              </div>
            </div>
          </>
        ) : currentView === 'produzione2026' ? (
          <Produzione2026View articles={articles} processes={processes} commitments={commitments} onUpdate={handleArticleUpdate} />
        ) : currentView === 'impegni' ? (
          <CommitmentsView onUpdate={handleArticleUpdate} username={username} />
        ) : currentView === 'clienti' ? (
          <ClientsView username={username} />
        ) : currentView === 'import' ? (
          <ImportDataView onImportComplete={handleArticleUpdate} />
        ) : (
          <MovementsView />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-slate-500 border-t border-slate-200 mt-auto bg-white">
        &copy; Investor-Tahashh 2026
      </footer>
    </div>
  );
}

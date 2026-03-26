import { useState, useEffect, useRef } from 'react';
import { LogOut, LayoutDashboard, Menu, Package, Activity, Users, History, BellRing, UploadCloud, Grid, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import clsx from 'clsx';
import ArticlesTable from './ArticlesTable';
import CommitmentsTable from './CommitmentsTable';
import ProductionMovement from './ProductionMovement';
import RegisterCommitment from './RegisterCommitment';
import CommitmentsView from './CommitmentsView';
import ClientsView from './ClientsView';
import MovementsView from './MovementsView';
import ImportDataView from './ImportDataView';
import BackupView from './BackupView';
import Produzione2026View from './Produzione2026View';
import ErrorReportChat from './ErrorReportChat';
import { MessageSquare } from 'lucide-react';
import { Article, Process, Commitment, AUTHORIZED_USERS } from '../types';
import { getDisponibilita, getCategory } from '../utils';

const checkAllarmi = (articoli: Article[], impegni: Commitment[]) => {
  const famiglie: Record<string, number> = {};

  articoli.forEach(a => {
    const tot = getDisponibilita(a, impegni);

    if (tot < 10) {
      const famiglia = getCategory(a.nome, a.codice) || "Senza famiglia";

      if (!famiglie[famiglia]) {
        famiglie[famiglia] = 0;
      }

      famiglie[famiglia] += tot;
    }
  });

  const famiglieInAllarme = Object.entries(famiglie)
    .filter(([_, totale]) => totale < 0);

  if (famiglieInAllarme.length === 0) {
    return null;
  }

  const messaggio = famiglieInAllarme
    .map(([famiglia, totale]) => {
      return `• ${famiglia}: totale negativo ${totale}`;
    })
    .join("\n");

  return {
    type: "ALLARME_SCORTE",
    message: `⚠️ Attenzione, ci sono famiglie con scorte negative:\n\n${messaggio}`,
    actions: [
      {
        label: "Visualizza articoli negativi",
        action: "VIEW_NEGATIVE_ITEMS"
      },
      {
        label: "Visualizza più tardi",
        action: "DISMISS"
      }
    ]
  };
};

const SHOW_ERROR_CHAT = true; // Feature toggle per la sezione "Segnala Errori"
const CHAT_AUTHORIZED_USERS = ['LucaTurati', 'TahaJbala'];

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

type OnlineUser = { username: string };

export default function Dashboard({ username, onLogout }: DashboardProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'produzione2026' | 'produzione2026spc' | 'impegni' | 'clienti' | 'movimenti' | 'import' | 'backup' | 'errorChat'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [productionFamilyFilter, setProductionFamilyFilter] = useState('Tutte');
  const [isProduzioneMenuExpanded, setIsProduzioneMenuExpanded] = useState(false);
  const [isPorteMenuExpanded, setIsPorteMenuExpanded] = useState(false);
  const [isRetriMenuExpanded, setIsRetriMenuExpanded] = useState(false);
  const [isLateraliMenuExpanded, setIsLateraliMenuExpanded] = useState(false);
  const [isPiastreMenuExpanded, setIsPiastreMenuExpanded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const [isAlarmDismissed, setIsAlarmDismissed] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  const isAuthorized = AUTHORIZED_USERS.includes(username);
  const isChatAuthorized = CHAT_AUTHORIZED_USERS.includes(username);
  
  const prevArticlesRef = useRef<Article[]>([]);
  const prevCommitmentsRef = useRef<Commitment[]>([]);
  const currentViewRef = useRef(currentView);

  useEffect(() => {
    currentViewRef.current = currentView;
    if (currentView === 'errorChat') {
      setUnreadChatCount(0);
    }
  }, [currentView]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      setSocket(ws);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'login', username }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'users') {
            setOnlineUsers(data.users);
          } else if (data.type === 'chat_message') {
            const msg = data.message;
            if (currentViewRef.current !== 'errorChat' && msg && msg.sender !== username) {
              setUnreadChatCount(prev => prev + 1);
              toast(`Nuovo messaggio da ${msg.sender} in "Segnala Errori"`, {
                icon: '💬',
                duration: 3000,
                position: 'bottom-right',
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'logout', username }));
        }
        ws.close();
      }
    };
  }, [username]);

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
      
      if (!articlesRes.ok) {
        const error = await articlesRes.text();
        throw new Error(`Articles fetch failed: ${error}`);
      }
      if (!processesRes.ok) {
        const error = await processesRes.text();
        throw new Error(`Processes fetch failed: ${error}`);
      }
      if (!commitmentsRes.ok) {
        const error = await commitmentsRes.text();
        throw new Error(`Commitments fetch failed: ${error}`);
      }
      
      const articlesData: Article[] = await articlesRes.json();
      const processesData: Process[] = await processesRes.json();
      const commitmentsData = await commitmentsRes.json();
      
      // Check for low availability
      if (prevArticlesRef.current.length > 0) {
        const lowStockAlerts: { article: Article, disp: number, action: string }[] = [];
        
        articlesData.forEach(newArticle => {
          const oldArticle = prevArticlesRef.current.find(a => a.id === newArticle.id);
          if (oldArticle) {
            const oldDisp = getDisponibilita(oldArticle, prevCommitmentsRef.current);
            const newDisp = getDisponibilita(newArticle, commitmentsData);
            
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

              lowStockAlerts.push({
                article: newArticle,
                disp: newDisp,
                action: action
              });
            }
          }
        });

        if (lowStockAlerts.length > 0) {
          if (lowStockAlerts.length <= 5) {
            lowStockAlerts.forEach(alert => {
              const message = `Disponibilità: ${alert.disp} pz per ${alert.article.nome}. Necessario: ${alert.action.toUpperCase()}`;
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
            });
          } else {
            const message = `${lowStockAlerts.length} articoli sono scesi sotto la scorta minima! Controlla la tabella per i dettagli.`;
            toast.error(message, {
              duration: 8000,
              icon: '⚠️',
            });
          }
        }
      }
      
      // Check for new commitments
      if (prevCommitmentsRef.current.length > 0 && commitmentsData.length > prevCommitmentsRef.current.length) {
        const newCommitmentsCount = commitmentsData.length - prevCommitmentsRef.current.length;
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
      prevCommitmentsRef.current = commitmentsData;
      
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
      case 'produzione2026spc': return 'Produzione 2026 SPC';
      case 'impegni': return 'Gestione Impegni';
      case 'clienti': return 'Anagrafica Clienti';
      case 'movimenti': return 'Cronologia Movimenti';
      case 'import': return 'Importazione Dati';
      case 'backup': return 'Backup e Ripristino';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Sfondo con pattern leggerissimo per un look più tecnico/professionale */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
      
      <Toaster position="top-right" toastOptions={{ className: 'font-medium rounded-xl shadow-lg' }} />
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white shadow-lg relative z-50 border-b border-blue-800/50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 relative group"
            >
              <Menu className="h-6 w-6 text-blue-100 group-hover:text-white transition-colors" />
              {unreadChatCount > 0 && currentView !== 'errorChat' && (
                <span className="absolute top-1 right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-slate-900"></span>
                </span>
              )}
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg shadow-blue-500/20 border border-white/10">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">AUGER</h1>
                <p className="text-[11px] text-blue-300 font-bold tracking-widest uppercase">
                  {getViewTitle()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative group flex items-center gap-2 cursor-pointer">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-all backdrop-blur-md">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
                <Users className="h-4 w-4 text-blue-200" />
                <span className="text-sm font-bold text-white">{onlineUsers.length}</span>
              </div>
              
              <div className="absolute top-full right-0 mt-3 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Utenti Online</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-2">
                  {onlineUsers.map(user => (
                    <div key={user.username} className="px-4 py-2.5 flex flex-col gap-1 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-600">
                          <span className="text-xs font-bold text-emerald-400">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm text-slate-200 font-medium truncate">
                          {user.username} {user.username === username && <span className="text-slate-500 text-xs ml-1">(Tu)</span>}
                        </span>
                      </div>
                    </div>
                  ))}
                  {onlineUsers.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-500 italic text-center">Nessun utente online</div>
                  )}
                </div>
              </div>
            </div>

            {checkAllarmi(articles, commitments) && (
              <div 
                className="flex items-center justify-center h-10 w-10 bg-red-500 hover:bg-red-400 transition-colors rounded-full animate-pulse cursor-pointer shadow-lg shadow-red-500/30 border border-red-400/50" 
                title="Allarme scorte negative"
                onClick={() => {
                  setProductionFamilyFilter('Tutte');
                  setCurrentView('produzione2026');
                }}
              >
                <BellRing className="h-5 w-5 text-white" />
              </div>
            )}
            {notificationPermission === 'default' && (
              <button
                onClick={requestNotificationPermission}
                className="flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 transition-colors px-4 py-2 rounded-xl hover:bg-white/5 border border-amber-500/30 backdrop-blur-sm"
              >
                <BellRing className="h-4 w-4" />
                <span className="hidden sm:inline font-medium">Attiva Notifiche</span>
              </button>
            )}
            <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-white/10">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-2 border-white/20 shadow-inner">
                <span className="text-sm font-bold text-white">{username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Operatore</span>
                <span className="text-sm font-bold text-white">{username}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition-colors px-3 py-2 rounded-xl hover:bg-white/10"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-20 left-4 w-72 bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-slate-700/50 py-3 rounded-2xl z-50 overflow-hidden">
            <button
              onClick={() => { setCurrentView('dashboard'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'dashboard' ? 'bg-blue-500/10 text-blue-400 border-l-4 border-blue-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <Activity className="h-5 w-5" />
              <span>Panoramica Produzione</span>
            </button>
            <div className="flex flex-col">
              <div className="flex items-center">
                <button
                  onClick={() => { setCurrentView('produzione2026'); setMenuOpen(false); }}
                  className={`flex-1 text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'produzione2026' ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
                >
                  <Grid className="h-5 w-5" />
                  <span>Produzione 2026</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsProduzioneMenuExpanded(!isProduzioneMenuExpanded);
                  }}
                  className="px-4 py-3.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors border-l border-slate-700/50"
                >
                  {isProduzioneMenuExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </div>
              
              {isProduzioneMenuExpanded && (
                <div className="bg-slate-900/50 py-1 border-l-4 border-transparent">
                  <button
                    onClick={() => { 
                      setProductionFamilyFilter('Tutte'); 
                      setCurrentView('produzione2026'); 
                      setMenuOpen(false); 
                    }}
                    className={`w-full text-left pl-14 pr-6 py-2 text-xs transition-colors ${productionFamilyFilter === 'Tutte' && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    Tutte le famiglie
                  </button>
                  {[
                    'Porte', 'Retri', 'Laterali', 'Tetti', 'Piastre', 'Basi&Tetti', 
                    'Strutture Agr', 'AGS', 'AGC', 'AGLM', 'AGLC', 'Cristalli', 'INVOLUCRI AT'
                  ].map(family => {
                    const isFamilyActive = productionFamilyFilter === family || 
                      (family === 'Porte' && ['Porte Standard', 'Porte IB/CB', 'Porte PX/PV', 'Porte INT/LAT/180°'].includes(productionFamilyFilter)) ||
                      (family === 'Retri' && ['Retri', 'Montanti Centrali Retro'].includes(productionFamilyFilter)) ||
                      (family === 'Laterali' && ['Laterali', 'Laterali Ibridi'].includes(productionFamilyFilter)) ||
                      (family === 'Piastre' && ['Piastre Frontali', 'Piastre Laterali'].includes(productionFamilyFilter));
                    
                    const hasSubMenu = ['Porte', 'Retri', 'Laterali', 'Piastre'].includes(family);
                    const isExpanded = (family === 'Porte' && isPorteMenuExpanded) || 
                                     (family === 'Retri' && isRetriMenuExpanded) ||
                                     (family === 'Laterali' && isLateraliMenuExpanded) ||
                                     (family === 'Piastre' && isPiastreMenuExpanded);
                    
                    return (
                      <div key={family} className="flex flex-col">
                      <div className="flex items-center">
                        <button
                          onClick={() => { 
                            setProductionFamilyFilter(family); 
                            setCurrentView('produzione2026'); 
                            setMenuOpen(false); 
                          }}
                          className={`flex-1 text-left pl-14 pr-2 py-2 text-xs transition-colors ${isFamilyActive && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          {family}
                        </button>
                        {hasSubMenu && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (family === 'Porte') setIsPorteMenuExpanded(!isPorteMenuExpanded);
                              if (family === 'Retri') setIsRetriMenuExpanded(!isRetriMenuExpanded);
                              if (family === 'Laterali') setIsLateraliMenuExpanded(!isLateraliMenuExpanded);
                              if (family === 'Piastre') setIsPiastreMenuExpanded(!isPiastreMenuExpanded);
                            }}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                      {family === 'Porte' && isPorteMenuExpanded && (
                        <div className="bg-slate-950/30 py-1">
                          {['Porte Standard', 'Porte IB/CB', 'Porte PX/PV', 'Porte INT/LAT/180°'].map(subFamily => (
                            <button
                              key={subFamily}
                              onClick={() => { 
                                setProductionFamilyFilter(subFamily); 
                                setCurrentView('produzione2026'); 
                                setMenuOpen(false); 
                              }}
                              className={`w-full text-left pl-16 pr-6 py-1.5 text-[11px] transition-colors ${productionFamilyFilter === subFamily && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                            >
                              {subFamily}
                            </button>
                          ))}
                        </div>
                      )}
                      {family === 'Retri' && isRetriMenuExpanded && (
                        <div className="bg-slate-950/30 py-1">
                          {['Retri', 'Montanti Centrali Retro'].map(subFamily => (
                            <button
                              key={subFamily}
                              onClick={() => { 
                                setProductionFamilyFilter(subFamily); 
                                setCurrentView('produzione2026'); 
                                setMenuOpen(false); 
                              }}
                              className={`w-full text-left pl-16 pr-6 py-1.5 text-[11px] transition-colors ${productionFamilyFilter === subFamily && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                            >
                              {subFamily}
                            </button>
                          ))}
                        </div>
                      )}
                      {family === 'Laterali' && isLateraliMenuExpanded && (
                        <div className="bg-slate-950/30 py-1">
                          {['Laterali', 'Laterali Ibridi'].map(subFamily => (
                            <button
                              key={subFamily}
                              onClick={() => { 
                                setProductionFamilyFilter(subFamily); 
                                setCurrentView('produzione2026'); 
                                setMenuOpen(false); 
                              }}
                              className={`w-full text-left pl-16 pr-6 py-1.5 text-[11px] transition-colors ${productionFamilyFilter === subFamily && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                            >
                              {subFamily}
                            </button>
                          ))}
                        </div>
                      )}
                      {family === 'Piastre' && isPiastreMenuExpanded && (
                        <div className="bg-slate-950/30 py-1">
                          {['Piastre Frontali', 'Piastre Laterali'].map(subFamily => (
                            <button
                              key={subFamily}
                              onClick={() => { 
                                setProductionFamilyFilter(subFamily); 
                                setCurrentView('produzione2026'); 
                                setMenuOpen(false); 
                              }}
                              className={`w-full text-left pl-16 pr-6 py-1.5 text-[11px] transition-colors ${productionFamilyFilter === subFamily && currentView === 'produzione2026' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-white'}`}
                            >
                              {subFamily}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </div>
            <button
              onClick={() => { setCurrentView('impegni'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'impegni' ? 'bg-indigo-500/10 text-indigo-400 border-l-4 border-indigo-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <Package className="h-5 w-5" />
              <span>Tabella Impegni</span>
            </button>
            <button
              onClick={() => { setCurrentView('clienti'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'clienti' ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <Users className="h-5 w-5" />
              <span>Clienti</span>
            </button>
            <button
              onClick={() => { setCurrentView('movimenti'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'movimenti' ? 'bg-orange-500/10 text-orange-400 border-l-4 border-orange-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <History className="h-5 w-5" />
              <span>Movimenti</span>
            </button>
            <div className="border-t border-slate-700/50 my-2 mx-4"></div>
            <button
              onClick={() => { setCurrentView('import'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'import' ? 'bg-purple-500/10 text-purple-400 border-l-4 border-purple-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <UploadCloud className="h-5 w-5" />
              <span>Importa Dati</span>
            </button>
            <button
              onClick={() => { setCurrentView('backup'); setMenuOpen(false); }}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all ${currentView === 'backup' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-500 font-semibold' : 'text-slate-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent font-medium'}`}
            >
              <Database className="h-5 w-5" />
              <span>Backup e Ripristino</span>
            </button>
            {SHOW_ERROR_CHAT && isChatAuthorized && (
              <button
                onClick={() => { setCurrentView('errorChat'); setMenuOpen(false); }}
                className={clsx(
                  "w-full text-left px-6 py-3.5 flex items-center justify-between transition-all group",
                  currentView === 'errorChat' ? 'bg-rose-500/10 text-rose-400 border-l-4 border-rose-500 font-semibold' : 'text-rose-300/80 hover:bg-white/5 hover:text-rose-300 border-l-4 border-transparent font-medium'
                )}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className={clsx("h-5 w-5", unreadChatCount > 0 && currentView !== 'errorChat' ? "text-green-400 animate-pulse" : "")} />
                  <span className={clsx("font-medium", unreadChatCount > 0 && currentView !== 'errorChat' ? "text-green-400" : "")}>
                    Segnala Errori
                  </span>
                </div>
                {unreadChatCount > 0 && currentView !== 'errorChat' && (
                  <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce">
                    {unreadChatCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 relative z-10" onClick={() => menuOpen && setMenuOpen(false)}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : currentView === 'dashboard' ? (
          <>
            {/* Alert Banner for items under scorta */}
            {(() => {
              const allarme = checkAllarmi(articles, commitments);
              if (allarme && !isAlarmDismissed) {
                return (
                  <div className="bg-white border-l-4 border-red-500 p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(239,68,68,0.15)] flex flex-col gap-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="bg-red-50 p-3 rounded-xl mt-0.5 border border-red-100">
                        <BellRing className="h-6 w-6 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-800 font-semibold text-lg mb-1">Attenzione Richiesta</div>
                        <div className="text-slate-600 font-medium whitespace-pre-wrap text-sm leading-relaxed">
                          {allarme.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3 ml-16 relative z-10">
                      <button 
                        onClick={() => {
                          setProductionFamilyFilter('Tutte');
                          setCurrentView('produzione2026');
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
                      >
                        {allarme.actions[0].label}
                      </button>
                      <button 
                        onClick={() => setIsAlarmDismissed(true)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow"
                      >
                        {allarme.actions[1].label}
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Top Section: Operational Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-200/60 overflow-hidden backdrop-blur-sm transition-all hover:shadow-[0_8px_25px_-5px_rgba(6,81,237,0.12)]">
                <ProductionMovement articles={articles} onUpdate={handleArticleUpdate} username={username} />
              </div>
              <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-200/60 overflow-hidden backdrop-blur-sm transition-all hover:shadow-[0_8px_25px_-5px_rgba(6,81,237,0.12)]">
                <RegisterCommitment articles={articles} onUpdate={handleArticleUpdate} username={username} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" style={{ height: 'calc(100vh - 450px)', minHeight: '500px' }}>
              {/* Left Column: Articles (7 columns) */}
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-200/60 overflow-hidden flex flex-col h-full backdrop-blur-sm">
                <ArticlesTable articles={articles} commitments={commitments} processes={processes} onUpdate={handleArticleUpdate} />
              </div>

              {/* Right Column: Commitments (5 columns) */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(6,81,237,0.08)] border border-slate-200/60 overflow-hidden flex flex-col h-full backdrop-blur-sm">
                <CommitmentsTable articles={articles} onUpdate={handleArticleUpdate} username={username} />
              </div>
            </div>
          </>
        ) : currentView === 'produzione2026' ? (
          <Produzione2026View 
            articles={articles} 
            processes={processes} 
            commitments={commitments} 
            onUpdate={handleArticleUpdate}
            categoryFilter={productionFamilyFilter}
            setCategoryFilter={setProductionFamilyFilter}
          />
        ) : currentView === 'impegni' ? (
          <CommitmentsView onUpdate={handleArticleUpdate} username={username} />
        ) : currentView === 'clienti' ? (
          <ClientsView username={username} isAuthorized={isAuthorized} />
        ) : currentView === 'import' ? (
          <ImportDataView onImportComplete={handleArticleUpdate} />
        ) : currentView === 'backup' ? (
          <BackupView />
        ) : currentView === 'errorChat' && SHOW_ERROR_CHAT && isChatAuthorized ? (
          <ErrorReportChat username={username} socket={socket} />
        ) : (
          <MovementsView />
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-sm text-slate-400 border-t border-slate-200/60 mt-auto bg-white/50 backdrop-blur-sm font-medium relative z-10">
        &copy; {new Date().getFullYear()} Auger S.r.l. - Sistema Gestionale Produzione
      </footer>
    </div>
  );
}

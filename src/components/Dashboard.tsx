import { useState, useEffect } from 'react';
import { LogOut, LayoutDashboard, Menu, Package, Activity, Users } from 'lucide-react';
import ArticlesTable from './ArticlesTable';
import ProcessesTable from './ProcessesTable';
import CommitmentsTable from './CommitmentsTable';
import ProductionChart from './ProductionChart';
import ProductionMovement from './ProductionMovement';
import CommitmentsView from './CommitmentsView';
import ClientsView from './ClientsView';
import { Article, Process } from '../types';

interface DashboardProps {
  username: string;
  onLogout: () => void;
}

export default function Dashboard({ username, onLogout }: DashboardProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'impegni' | 'clienti'>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [articlesRes, processesRes] = await Promise.all([
        fetch('/api/articles'),
        fetch('/api/processes')
      ]);
      
      const articlesData = await articlesRes.json();
      const processesData = await processesRes.json();
      
      setArticles(articlesData);
      setProcesses(processesData);
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

  const handleArticleUpdate = () => {
    fetchData();
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Panoramica Produzione';
      case 'impegni': return 'Gestione Impegni';
      case 'clienti': return 'Anagrafica Clienti';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
            {/* Top Section: Chart & Movement */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Panoramica Produzione (Top 10)</h2>
                <ProductionChart articles={articles} />
              </div>
              <div className="lg:col-span-4">
                <ProductionMovement articles={articles} onUpdate={handleArticleUpdate} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" style={{ height: 'calc(100vh - 450px)', minHeight: '500px' }}>
              {/* Left Column: Articles (5 columns) */}
              <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                <ArticlesTable articles={articles} onUpdate={handleArticleUpdate} />
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
        ) : currentView === 'impegni' ? (
          <CommitmentsView articles={articles} onUpdate={handleArticleUpdate} username={username} />
        ) : (
          <ClientsView username={username} />
        )}
      </main>
    </div>
  );
}

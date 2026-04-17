import { useState, useEffect } from 'react';
import { Brain, Sparkles, AlertTriangle, TrendingUp, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Article, Process, Commitment } from '../types';
import { getDisponibilita, getCategory } from '../utils';
import clsx from 'clsx';

interface AIProductionAdvisorProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
}

export default function AIProductionAdvisor({ articles, commitments, processes }: AIProductionAdvisorProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached advice on mount
  useEffect(() => {
    const cached = localStorage.getItem('ai_advisor_cache');
    if (cached) {
      try {
        const { advice: cachedAdvice, timestamp } = JSON.parse(cached);
        // Cache valid for 1 hour
        if (Date.now() - timestamp < 3600000) {
          setAdvice(cachedAdvice);
          setLastUpdated(timestamp);
        }
      } catch (e) {
        localStorage.removeItem('ai_advisor_cache');
      }
    }
  }, []);

  const generateAdvice = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Prepare data summary for AI
      const criticalItems = articles
        .map(a => ({
          nome: a.nome,
          codice: a.codice,
          disponibilita: getDisponibilita(a, commitments),
          scorta: a.scorta || 0,
          famiglia: getCategory(a.nome, a.codice)
        }))
        .filter(a => a.disponibilita < 0)
        .sort((a, b) => a.disponibilita - b.disponibilita)
        .slice(0, 15);

      const commitmentsSummary = commitments
        .filter(c => {
          const art = articles.find(a => a.id === c.articolo_id);
          return art && getDisponibilita(art, commitments) < 0;
        })
        .slice(0, 10)
        .map(c => ({
          cliente: c.cliente,
          articolo: articles.find(a => a.id === c.articolo_id)?.nome,
          quantita: c.quantita
        }));

      const prompt = `
Sei un esperto di pianificazione della produzione industriale per l'azienda Auger.
Analizza lo stato attuale del magazzino e degli impegni e fornisci una strategia di produzione ottimale.

DATI CRITICI (Articoli con disponibilità negativa):
${JSON.stringify(criticalItems, null, 2)}

IMPEGNI RECENTI SU ARTICOLI CRITICI:
${JSON.stringify(commitmentsSummary, null, 2)}

OBIETTIVO:
1. Identifica i 3 articoli più urgenti da produrre (priorità massima).
2. Suggerisci se è meglio concentrarsi su una specifica famiglia di prodotti (es. Porte, Tetti, Strutture).
3. Fornisci un consiglio strategico per ottimizzare il flusso di lavoro (es. raggruppare ordini simili).

FORMATO RISPOSTA:
Usa Markdown. Sii conciso, professionale e diretto. Usa icone emoji per i punti chiave.
Rispondi in ITALIANO.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const newAdvice = response.text;
      if (newAdvice) {
        setAdvice(newAdvice);
        const now = Date.now();
        setLastUpdated(now);
        localStorage.setItem('ai_advisor_cache', JSON.stringify({
          advice: newAdvice,
          timestamp: now
        }));
      }
    } catch (err: any) {
      console.error("AI Advisor Error:", err);
      
      if (err.message?.includes('429') || err.status === 'RESOURCE_EXHAUSTED') {
        setError("Quota IA esaurita per oggi. Riprova più tardi o usa la tua chiave API.");
      } else {
        setError("Impossibile generare consigli al momento. Verifica la connessione.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only auto-generate if we don't have advice and we have data
    if (articles.length > 0 && !advice && !isLoading) {
      generateAdvice();
    }
  }, [articles, advice]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold">Consulente Strategico IA</h3>
            <p className="text-indigo-100 text-[10px] uppercase tracking-wider font-medium">Analisi Predittiva Produzione</p>
          </div>
        </div>
        <button 
          onClick={generateAdvice}
          disabled={isLoading}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          title="Aggiorna analisi"
        >
          <RefreshCw className={clsx("w-4 h-4 text-white", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-5 h-5 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-slate-500 text-sm font-medium animate-pulse">L'IA sta elaborando la strategia ottimale...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="text-slate-600 text-sm">{error}</p>
            <button 
              onClick={generateAdvice}
              className="text-indigo-600 font-bold text-sm hover:underline"
            >
              Riprova ora
            </button>
          </div>
        ) : advice ? (
          <div className="prose prose-slate prose-sm max-w-none">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-tight mb-2">
                <TrendingUp className="w-4 h-4" />
                Analisi {lastUpdated ? `aggiornata alle ${new Date(lastUpdated).toLocaleTimeString()}` : 'in Tempo Reale'}
              </div>
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {advice}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Basato su {articles.length} articoli e {commitments.length} impegni attivi.
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <button 
              onClick={generateAdvice}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              Avvia Analisi IA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, User, Loader2, MicOff, CheckCircle2, XCircle } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { Article, Client } from '../types';

interface CommitmentsChatbotProps {
  articles: Article[];
  clients: Client[];
  onExtracted: (data: {
    articoloId?: string;
    cliente?: string;
    commessa?: string;
    quantita?: number;
  }) => void;
  onConfirm: (data: {
    articoloId: string;
    cliente: string;
    commessa: string;
    quantita: number;
  }) => Promise<boolean>;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  isConfirmation?: boolean;
  commitmentData?: {
    articoloId: string;
    cliente: string;
    commessa: string;
    quantita: number;
  };
}

export default function CommitmentsChatbot({ articles, clients, onExtracted, onConfirm }: CommitmentsChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Ciao! Dimmi o scrivimi i dettagli dell\'impegno che vuoi registrare (es. "Metti un impegno a Rivacold, commessa 1234, articolo AG-PO0820, quantità 50").' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleSendRef = useRef<any>(null);

  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'it-IT';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        if (handleSendRef.current) {
          handleSendRef.current(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConfirmAction = async (msgId: string, data: any) => {
    setIsLoading(true);
    // Rimuovi la card di conferma
    setMessages(prev => prev.filter(m => m.id !== msgId));
    
    const success = await onConfirm(data);
    
    if (success) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'bot',
        text: 'Impegno registrato con successo! 🎉'
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'bot',
        text: 'Si è verificato un errore durante la registrazione dell\'impegno.'
      }]);
    }
    setIsLoading(false);
  };

  const handleCancelAction = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'bot',
      text: 'Operazione annullata. Dimmi se posso aiutarti con altro.'
    }]);
  };

  const handleSend = async (textToSend: string = input) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const articlesList = articles.map(a => `${a.nome} (Codice: ${a.codice}, ID: ${a.id})`).join('\n');
      const clientsList = clients.map(c => c.nome).join('\n');

      const prompt = `
Sei il motore di ragionamento avanzato della Dashboard Auger, specializzato nell'estrazione e validazione di dati industriali.
Il tuo compito è analizzare il messaggio dell'utente per registrare un nuovo "Impegno Cliente" con precisione chirurgica.

CONTESTO OPERATIVO:
- Gli articoli hanno nomi descrittivi (es. "PORTA 600X2000") e codici tecnici univoci (es. "AG-PO0620").
- I clienti sono entità registrate nel sistema.
- Le commesse sono identificativi di progetto (es. "C.702", "C-1234", "ORDINE 55").
- La quantità deve essere un numero intero positivo.

DATI DI RIFERIMENTO (USA SOLO QUESTI):
Articoli Disponibili:
${articlesList}

Clienti Registrati:
${clientsList}

MESSAGGIO DA ANALIZZARE:
"${textToSend}"

LOGICA DI RAGIONAMENTO (STEP-BY-STEP):
1. ANALISI ARTICOLO: 
   - Cerca prima un match esatto sul codice (es. "AG-PO0620").
   - Se non trovi il codice, analizza le dimensioni nel testo (es. "600 per 2000") e confrontale con i nomi degli articoli.
   - Considera varianti di separatori: "X", "*", " ", "/", "-".
   - Se l'utente è vago, identifica l'articolo più probabile ma segnalalo nella risposta.

2. ANALISI CLIENTE:
   - Confronta il nome citato con la lista clienti.
   - Gestisci sinonimi o abbreviazioni comuni (es. "R&M" per "R e M", "Rivacold" per "Rivacold srl").

3. ANALISI COMMESSA:
   - Estrai codici alfanumerici. Spesso preceduti da "commessa", "ordine", "C.", "rif.".

4. ANALISI QUANTITÀ:
   - Cerca numeri associati a "pezzi", "unità", "quantità" o numeri isolati che hanno senso nel contesto.

5. VALIDAZIONE FINALE:
   - Se mancano dati critici, chiedili in modo specifico.
   - Se i dati sono completi, prepara una conferma chiara.

REGOLE DI OUTPUT:
- Restituisci un oggetto JSON puro.
- "rispostaTestuale" deve essere in italiano, professionale, concisa e rassicurante.
- Se trovi l'articolo, usa il suo ID esatto dalla lista fornita.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              articoloId: { type: Type.STRING, description: "ID dell'articolo trovato" },
              cliente: { type: Type.STRING, description: "Nome del cliente trovato" },
              commessa: { type: Type.STRING, description: "Codice commessa trovato" },
              quantita: { type: Type.NUMBER, description: "Quantità numerica trovata" },
              rispostaTestuale: { type: Type.STRING, description: "Un breve messaggio di risposta per l'utente, es. 'Ho compilato i campi trovati.' oppure 'Mi manca la quantità, puoi specificarla?'" }
            }
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        // Pulisci eventuale markdown dal JSON
        let cleanText = resultText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        const result = JSON.parse(cleanText);
        
        onExtracted({
          articoloId: result.articoloId,
          cliente: result.cliente,
          commessa: result.commessa,
          quantita: result.quantita
        });

        const isComplete = result.articoloId && result.cliente && result.commessa && result.quantita;

        if (isComplete) {
          setMessages(prev => [
            ...prev, 
            { 
              id: Date.now().toString() + '_text', 
              role: 'bot', 
              text: 'Ho trovato tutti i dati necessari. Vuoi confermare la registrazione?' 
            },
            {
              id: Date.now().toString() + '_confirm',
              role: 'bot',
              text: '',
              isConfirmation: true,
              commitmentData: {
                articoloId: result.articoloId,
                cliente: result.cliente,
                commessa: result.commessa,
                quantita: result.quantita
              }
            }
          ]);
        } else {
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'bot', 
            text: result.rispostaTestuale || 'Ho compilato i campi con i dati trovati nel tuo messaggio. Manca ancora qualche dato per completare l\'operazione.' 
          }]);
        }
      }

    } catch (error) {
      console.error("Gemini API error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'bot', 
        text: 'Scusa, si è verificato un errore durante l\'elaborazione del messaggio.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getArticleName = (id: string) => {
    const article = articles.find(a => a.id.toString() === id);
    return article ? `${article.nome} (${article.codice})` : id;
  };

  return (
    <div className="flex flex-col h-[450px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
        <Bot className="h-5 w-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800 text-sm">Assistente IA</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            
            {msg.isConfirmation && msg.commitmentData ? (
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm overflow-hidden max-w-[85%]">
                <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100">
                  <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Riepilogo Impegno</span>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Articolo:</span>
                    <span className="col-span-2 text-slate-900 font-medium">{getArticleName(msg.commitmentData.articoloId)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Cliente:</span>
                    <span className="col-span-2 text-slate-900 font-medium">{msg.commitmentData.cliente}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Commessa:</span>
                    <span className="col-span-2 text-slate-900 font-mono">{msg.commitmentData.commessa}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Quantità:</span>
                    <span className="col-span-2 text-slate-900 font-mono font-bold">{msg.commitmentData.quantita}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 border-t border-slate-100 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleConfirmAction(msg.id, msg.commitmentData)}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Conferma
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleCancelAction(msg.id)}
                    className="flex-1 flex items-center justify-center gap-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Annulla
                  </button>
                </div>
              </div>
            ) : (
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                {msg.text}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm text-slate-500">Elaborazione...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2">
          {((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={isListening ? "Ferma registrazione" : "Parla"}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Scrivi o detta un impegno..."
            className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isLoading || isListening}
          />
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || isListening}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

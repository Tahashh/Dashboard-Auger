import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, XCircle, Loader2, Users, X, ArrowRight, Link } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { fetchArticles, fetchClients, fetchProcesses, fetchCommitments, addArticle, addProcess, addClient } from '../api';

interface ImportDataViewProps {
  onImportComplete: () => void;
}

type ImportType = 'articoli' | 'clienti' | 'lavorazioni' | 'google-sheets';

interface MappedData {
  [key: string]: any;
  _status?: 'valid' | 'error' | 'duplicate';
  _errorMsg?: string;
}

export default function ImportDataView({ onImportComplete }: ImportDataViewProps) {
  const [importType, setImportType] = useState<ImportType>('articoli');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<MappedData[]>([]);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState({ success: 0, errors: 0, duplicates: 0 });
  const [lastError, setLastError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportArticlesToExcel = async () => {
    try {
      const articles = await fetchArticles();
      const processes = await fetchProcesses();
      
      const processesMap = new Map();
      processes.forEach(p => {
        processesMap.set(p.articolo_id, p);
      });
      
      const data = articles.map(a => {
        const p = processesMap.get(a.id);
        return {
          'Nome Articolo': a.nome,
          'Codice Articolo': a.codice,
          'Pezzi Verniciati': a.verniciati,
          'Impegni Clienti': a.impegni_clienti,
          'Disponibilità': (a.verniciati || 0) - (a.impegni_clienti || 0),
          'Piega': p ? p.piega : 0,
          'Prezzo': a.prezzo
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Articoli");
      
      XLSX.writeFile(workbook, `articoli_auger_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Esportazione articoli completata");
    } catch (error: any) {
      console.error(error);
      toast.error("Errore durante l'esportazione degli articoli");
    }
  };

  const exportClientsToExcel = async () => {
    try {
      const clients = await fetchClients();
      const commitments = await fetchCommitments();
      const articles = await fetchArticles();
      
      const articlePriceMap = articles.reduce((acc: any, article: any) => {
        acc[article.id] = article.prezzo || 0;
        return acc;
      }, {});
      
      const clientAmountMap = commitments.reduce((acc: any, commitment: any) => {
        if (commitment.stato_lavorazione !== 'Completato' && commitment.stato_lavorazione !== 'Annullato') {
          const price = articlePriceMap[commitment.articolo_id] || 0;
          const amount = commitment.quantita * price;
          acc[commitment.cliente] = (acc[commitment.cliente] || 0) + amount;
        }
        return acc;
      }, {});
      
      const worksheet = XLSX.utils.json_to_sheet(clients.map((c: any) => ({
        'Ragione Sociale': c.nome,
        'Email': c.email || '',
        'Telefono': c.telefono || '',
        'Data Inserimento': c.data_inserimento,
        'Importo Totale Impegni (€)': (clientAmountMap[c.nome] || 0).toFixed(2)
      })));
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Clienti");
      
      XLSX.writeFile(workbook, `clienti_auger_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Esportazione clienti completata");
    } catch (error: any) {
      console.error(error);
      toast.error("Errore durante l'esportazione dei clienti");
    }
  };

  const googleSheetsScript = `function sincronizzaTuttoIlFoglio() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var url = "${window.location.origin}/api/webhook/lavorazioni";
  
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert("Il foglio sembra essere vuoto.");
    return;
  }
  
  var headers = data[0];
  var successCount = 0;
  var errorCount = 0;
  var lastError = "";
  
  // Partiamo dalla riga 1 (indice 1) assumendo che la riga 0 sia l'intestazione
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var nome = row[0]; // Colonna A (Misure / Nome Articolo)
    
    if (!nome) continue; // Salta le righe vuote
    
    var payload = {
      "nome": String(nome),
      "taglio": 0,
      "piega": 0,
      "saldatura": 0,
      "verniciatura": 0,
      "scorta": 0,
      "impegni_clienti": 0,
      "note": ""
    };
    
    var noteArray = [];
    
    // Analizziamo dinamicamente le colonne dalla B in poi
    for (var j = 1; j < headers.length; j++) {
      var header = String(headers[j]).toLowerCase().trim();
      var value = row[j];
      
      if (value === "" || value === null) continue;
      
      if (header.indexOf("tagli") !== -1) {
        payload.taglio = value;
      } else if (header.indexOf("pieg") !== -1) {
        payload.piega = value;
      } else if (header.indexOf("sald") !== -1) {
        payload.saldatura = value;
      } else if (header.indexOf("vernic") !== -1) {
        payload.verniciatura = value;
      } else if (header.indexOf("scorta") !== -1 || header.indexOf("minimo") !== -1) {
        payload.scorta = value;
      } else if (header.indexOf("impegn") !== -1 && header.indexOf("client") !== -1) {
        payload.impegni_clienti = value;
      } else {
        // Se non è una fase standard, assumiamo sia un Impegno/Cliente
        if (value) {
           // Se il valore è un numero, l'intestazione è il cliente e il valore è la quantità
           if (!isNaN(value) && value > 0) {
             noteArray.push(headers[j] + " " + value + "pz");
           } else if (typeof value === 'string') {
             // Se il valore è testuale (es. "Mario 50pz"), lo passiamo così com'è
             noteArray.push(value);
           }
        }
      }
    }
    
    payload.note = noteArray.join(", ");
    
    var options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    try {
      var response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() == 200) {
        successCount++;
      } else {
        errorCount++;
        lastError = response.getContentText();
      }
    } catch(e) {
      errorCount++;
      lastError = e.toString();
    }
  }
  
  var msg = "Sincronizzazione completata!\\nSuccessi: " + successCount + "\\nErrori: " + errorCount;
  if (errorCount > 0 && lastError) {
    msg += "\\nUltimo Errore: " + lastError;
  }
  SpreadsheetApp.getUi().alert(msg);
}`;

  const currentFields = importType === 'articoli' 
    ? [
        { key: 'nome', label: 'Nome Articolo', required: true },
        { key: 'codice', label: 'Codice Articolo', required: false },
        { key: 'verniciati', label: 'Pezzi Verniciati', required: false },
        { key: 'impegni_clienti', label: 'Impegni Clienti', required: false },
        { key: 'piega', label: 'Pezzi in Piega', required: false },
        { key: 'prezzo', label: 'Prezzo (€)', required: false },
        { key: 'note', label: 'Note / Impegni', required: false }
      ]
    : importType === 'clienti'
    ? [
        { key: 'nome', label: 'Ragione Sociale', required: true },
        { key: 'email', label: 'Email', required: false },
        { key: 'telefono', label: 'Telefono', required: false }
      ]
    : [
        { key: 'nome', label: 'Nome Articolo', required: true },
        { key: 'taglio', label: 'Taglio', required: false },
        { key: 'piega', label: 'Piega', required: false },
        { key: 'saldatura', label: 'Saldatura', required: false },
        { key: 'verniciatura', label: 'Verniciatura', required: false },
        { key: 'scorta', label: 'Scorta Minima', required: false },
        { key: 'impegni_clienti', label: 'Impegni Clienti', required: false },
        { key: 'note', label: 'Note / Impegni (es: Cliente 50pz)', required: false }
      ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const processFile = (file: File) => {
    try {
      setFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          
          if (json.length > 0) {
            const fileHeaders = json[0].map(h => String(h || '').trim());
            setHeaders(fileHeaders);
            setRawData(json.slice(1));
            
            // Auto-mapping
            const newMapping: Record<string, string> = {};
            currentFields.forEach(field => {
              const match = fileHeaders.find(h => 
                h.toLowerCase() === field.label.toLowerCase() || 
                h.toLowerCase() === field.key.toLowerCase()
              );
              if (match) newMapping[field.key] = match;
            });
            setMapping(newMapping);
            setStep(2);
          } else {
            toast.error("Il file sembra essere vuoto");
          }
        } catch (err) {
          console.error(err);
          toast.error("Errore durante la lettura del file. Assicurati che sia un file Excel o CSV valido.");
        }
      };
      reader.onerror = () => {
        toast.error("Errore durante il caricamento del file");
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      toast.error("Errore durante l'elaborazione del file");
    }
  };

  const generatePreview = () => {
    const preview: MappedData[] = rawData.map(row => {
      const mapped: MappedData = {};
      let hasError = false;
      let errorMsg = '';

      currentFields.forEach(field => {
        const headerIdx = headers.indexOf(mapping[field.key]);
        const value = headerIdx !== -1 ? row[headerIdx] : undefined;
        
        if (field.required && (value === undefined || value === '')) {
          hasError = true;
          errorMsg = `Campo richiesto mancante: ${field.label}`;
        }
        
        mapped[field.key] = value;
      });

      if (mapped.note) {
        const lines = String(mapped.note).split(/\n|,|;/).map(l => l.trim()).filter(l => l);
        if (lines.length > 0) {
          mapped._noteStr = `${lines.length} impegni rilevati`;
        }
      }

      mapped._status = hasError ? 'error' : 'valid';
      mapped._errorMsg = errorMsg;
      return mapped;
    });

    setPreviewData(preview);
    setStep(3);
  };

  const startImport = async () => {
    setIsImporting(true);
    setStep(4);
    
    const validRows = previewData.filter(r => r._status === 'valid');
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    const existingArticles = await fetchArticles();
    const existingClients = await fetchClients();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        if (importType === 'articoli' || importType === 'lavorazioni') {
          // Usiamo il webhook per entrambi poiché è più completo (gestisce note, impegni e creazione automatica)
          const payload = importType === 'articoli' ? {
            nome: row.nome,
            codice: row.codice,
            verniciatura: row.verniciati,
            impegni_clienti: row.impegni_clienti,
            piega: row.piega,
            prezzo: row.prezzo,
            note: row.note
          } : {
            nome: row.nome,
            taglio: row.taglio,
            piega: row.piega,
            saldatura: row.saldatura,
            verniciatura: row.verniciatura,
            scorta: row.scorta,
            impegni_clienti: row.impegni_clienti,
            note: row.note
          };

          const response = await fetch('/api/webhook/lavorazioni', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorText = await response.text();
            console.error('Webhook error:', errorText);
            errorCount++;
            setLastError(errorText);
          }
        } else if (importType === 'clienti') {
          const exists = existingClients.find(c => c.nome.toLowerCase() === String(row.nome).toLowerCase());
          if (exists) {
            duplicateCount++;
          } else {
            await addClient({
              nome: String(row.nome),
              email: String(row.email || ''),
              telefono: String(row.telefono || ''),
              data_inserimento: new Date().toISOString()
            });
            successCount++;
          }
        }
      } catch (err: any) {
        console.error('Import row error:', err);
        errorCount++;
        setLastError(err.message);
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setSummary({ success: successCount, errors: errorCount, duplicates: duplicateCount });
    setIsImporting(false);
    onImportComplete();
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRawData([]);
    setMapping({});
    setPreviewData([]);
    setStep(1);
    setProgress(0);
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-6 max-w-5xl mx-auto transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-sm">
            <Upload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Importazione Dati</h2>
            <p className="text-slate-500 mt-1">Importa articoli o clienti da file Excel o CSV</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button 
            onClick={exportArticlesToExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md text-sm border border-transparent"
          >
            <Download className="h-4 w-4" />
            Esporta Articoli
          </button>
          <button 
            onClick={exportClientsToExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md text-sm border border-transparent"
          >
            <Download className="h-4 w-4" />
            Esporta Clienti
          </button>
          {step > 1 && step < 4 && (
            <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
              Annulla e ricomincia
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 relative px-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100/80 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 -z-10 transition-all duration-500 rounded-full" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-12 h-12 rounded-full flex items-center justify-center font-bold border-4 shadow-sm transition-all duration-300 ${step >= s ? 'bg-gradient-to-br from-indigo-500 to-blue-600 border-white text-white shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400'}`}>
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setImportType('articoli')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${importType === 'articoli' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' : 'border-slate-200/60 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`p-3 rounded-xl ${importType === 'articoli' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="font-semibold">Importa Articoli</span>
            </button>
            <button
              onClick={() => setImportType('clienti')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${importType === 'clienti' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' : 'border-slate-200/60 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`p-3 rounded-xl ${importType === 'clienti' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <Users className="w-6 h-6" />
              </div>
              <span className="font-semibold">Importa Clienti</span>
            </button>
            <button
              onClick={() => setImportType('lavorazioni')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${importType === 'lavorazioni' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' : 'border-slate-200/60 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`p-3 rounded-xl ${importType === 'lavorazioni' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-semibold">Importa Lavorazioni</span>
            </button>
            <button
              onClick={() => setImportType('google-sheets')}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 ${importType === 'google-sheets' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm' : 'border-slate-200/60 hover:border-indigo-300 hover:bg-slate-50 text-slate-600'}`}
            >
              <div className={`p-3 rounded-xl ${importType === 'google-sheets' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <Link className="w-6 h-6" />
              </div>
              <span className="font-semibold">Sync Google Sheets</span>
            </button>
          </div>

          {importType === 'google-sheets' ? (
            <div className="bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 space-y-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                </div>
                Sincronizzazione Automatica da Google Sheets
              </h3>
              <p className="text-slate-600 text-lg">
                Puoi inviare automaticamente i dati da un file Google Sheets a questa applicazione utilizzando uno script (Google Apps Script).
              </p>
              
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-3 text-lg">Istruzioni per la struttura dinamica:</h4>
                <p className="text-slate-600 mb-5 leading-relaxed">
                  Questo script è intelligente e si adatta alla struttura del tuo foglio:
                  <br/><span className="inline-block mt-2 px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium text-sm">Colonna A:</span> Misure / Nome Articolo
                  <br/><span className="inline-block mt-2 px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium text-sm">Riga 1 (Intestazioni):</span> Nomi delle fasi (Taglio, Piega, ecc.) e nomi dei Clienti/Impegni.
                  <br/><span className="inline-block mt-2 px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium text-sm">Celle:</span> Le quantità per ogni fase o impegno.
                </p>
                <ol className="list-decimal list-inside space-y-3 text-slate-600 ml-2">
                  <li>Apri il tuo file Google Sheets</li>
                  <li>Vai su <strong className="text-slate-800">Estensioni</strong> &gt; <strong className="text-slate-800">Apps Script</strong></li>
                  <li>Incolla il codice sottostante</li>
                  <li>Esegui la funzione <code className="bg-slate-100 text-indigo-600 px-2 py-1 rounded font-mono text-sm border border-slate-200">sincronizzaTuttoIlFoglio</code></li>
                </ol>
              </div>

              <div className="space-y-4 pt-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-800 text-lg">Script di Sincronizzazione Intelligente</h4>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(googleSheetsScript);
                        toast.success('Codice copiato negli appunti!');
                      }}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      Copia Codice
                    </button>
                  </div>
                  <div className="bg-[#0d1117] rounded-xl p-5 overflow-x-auto border border-slate-800 shadow-inner">
                    <pre className="text-emerald-400 text-sm font-mono whitespace-pre-wrap leading-relaxed">
                      {googleSheetsScript}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-16 text-center hover:bg-indigo-50/80 hover:border-indigo-300 transition-all duration-300 cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-white w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-sm border border-indigo-100 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-10 h-10 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Trascina il file qui oppure clicca per sfogliare</h3>
              <p className="text-slate-500">Supporta file Excel (.xlsx, .xls) o CSV (.csv)</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv,.docx"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <div className="bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              Mappa le colonne del file con i campi del database
            </h3>
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-indigo-800 leading-relaxed">
                Assicurati che il campo <strong className="font-semibold">Nome Articolo</strong> sia mappato correttamente. 
                Il campo <strong className="font-semibold">Note / Impegni</strong> può contenere stringhe come "ClienteA 50pz, ClienteB 100pz" per creare automaticamente gli impegni.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentFields.map(field => (
                <div key={field.key} className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="border border-slate-200/60 rounded-xl p-3 text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="" className="text-slate-400">-- Ignora / Non mappare --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={generatePreview}
              className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              Genera Anteprima <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              </div>
              Anteprima Dati ({previewData.length} righe)
            </h3>
            <div className="flex gap-6 text-sm font-medium">
              <span className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><CheckCircle className="w-5 h-5" /> {previewData.filter(r => r._status === 'valid').length} Validi</span>
              <span className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100"><AlertCircle className="w-5 h-5" /> {previewData.filter(r => r._status === 'error').length} Errori</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 w-12 text-center font-semibold">Stato</th>
                  {currentFields.map(f => <th key={f.key} className="px-6 py-4 font-semibold">{f.label}</th>)}
                  <th className="px-6 py-4 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, idx) => (
                  <tr key={idx} className={`transition-colors hover:bg-slate-50/50 ${row._status === 'error' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-3 text-center">
                      {row._status === 'error' ? <XCircle className="w-5 h-5 text-red-500 mx-auto" /> : <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />}
                    </td>
                    {currentFields.map(f => (
                      <td key={f.key} className="px-6 py-3 text-slate-700">{row[f.key] !== undefined ? String(row[f.key]) : '-'}</td>
                    ))}
                    <td className="px-6 py-3 text-xs">
                      {row._noteStr && <div className="text-emerald-600 font-medium mb-1">{row._noteStr}</div>}
                      {row._errorMsg && <div className="text-red-600 font-medium">{row._errorMsg}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-amber-50/50 p-6 rounded-2xl border border-amber-200/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-amber-800 font-medium">
                Le righe con errori verranno ignorate durante l'importazione.
              </p>
            </div>
            <button 
              onClick={startImport}
              disabled={previewData.filter(r => r._status === 'valid').length === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-3 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              Conferma e Importa
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="py-16 text-center space-y-8 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm">
          {isImporting ? (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Importazione in corso...</h3>
                <p className="text-slate-500 mt-2">Elaborazione dei dati in corso, attendere prego.</p>
              </div>
              <div className="w-full max-w-md mx-auto bg-slate-100/80 rounded-full h-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-indigo-600 font-semibold">{progress}% completato</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-200">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Importazione Completata!</h3>
                <p className="text-slate-500 text-lg max-w-md mx-auto">I dati sono stati elaborati e salvati nel database.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto w-full px-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-emerald-600 mb-2">{summary.success}</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Importati</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-amber-500 mb-2">{summary.duplicates}</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Duplicati</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-4xl font-bold text-red-500 mb-2">{summary.errors}</div>
                  <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">Errori</div>
                </div>
              </div>

              <button 
                onClick={reset}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md mt-4"
              >
                Torna all'inizio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

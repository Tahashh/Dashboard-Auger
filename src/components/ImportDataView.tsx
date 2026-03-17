import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle, XCircle, ArrowRight, Loader2, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

interface ImportDataViewProps {
  onImportComplete: () => void;
}

type ImportType = 'articoli' | 'clienti';

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const articleFields = [
    { key: 'nome', label: 'Nome Articolo', required: true },
    { key: 'codice', label: 'Codice Articolo', required: true },
    { key: 'prezzo', label: 'Prezzo', required: false },
    { key: 'verniciati', label: 'Pezzi Verniciati (Iniziali)', required: false },
  ];

  const clientFields = [
    { key: 'nome', label: 'Ragione Sociale', required: true },
    { key: 'email', label: 'Email', required: false },
    { key: 'telefono', label: 'Telefono', required: false },
  ];

  const currentFields = importType === 'articoli' ? articleFields : clientFields;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'docx'].includes(ext || '')) {
      toast.error('Formato file non supportato. Usa Excel (.xlsx, .xls) o CSV.');
      return;
    }
    
    setFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (json.length < 2) {
          toast.error('Il file sembra essere vuoto o senza dati validi.');
          return;
        }

        const fileHeaders = json[0].map(h => String(h).trim());
        const fileData = json.slice(1).map(row => {
          const obj: any = {};
          fileHeaders.forEach((h, i) => {
            obj[h] = row[i];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== undefined && v !== null && v !== ''));

        setHeaders(fileHeaders);
        setRawData(fileData);
        
        // Auto-map headers
        const initialMapping: Record<string, string> = {};
        currentFields.forEach(field => {
          const match = fileHeaders.find(h => h.toLowerCase().includes(field.key.toLowerCase()) || h.toLowerCase().includes(field.label.toLowerCase()));
          if (match) initialMapping[field.key] = match;
        });
        setMapping(initialMapping);
        setStep(2);
      } catch (error) {
        console.error(error);
        toast.error('Errore durante la lettura del file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const generatePreview = () => {
    const mapped = rawData.map(row => {
      const newRow: MappedData = {};
      let hasError = false;
      let errorMsg = '';

      currentFields.forEach(field => {
        const fileHeader = mapping[field.key];
        let value = fileHeader ? row[fileHeader] : undefined;
        
        if (field.required && (value === undefined || value === null || value === '')) {
          hasError = true;
          errorMsg += `Manca ${field.label}. `;
        }
        
        if (field.key === 'prezzo' && value) {
          const num = parseFloat(String(value).replace(',', '.'));
          if (isNaN(num)) {
            hasError = true;
            errorMsg += `Prezzo non valido. `;
          } else {
            value = num;
          }
        }
        
        if (field.key === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            hasError = true;
            errorMsg += `Email non valida. `;
          }
        }

        newRow[field.key] = value;
      });

      newRow._status = hasError ? 'error' : 'valid';
      if (hasError) newRow._errorMsg = errorMsg;
      return newRow;
    });

    setPreviewData(mapped);
    setStep(3);
  };

  const startImport = async () => {
    setIsImporting(true);
    setStep(4);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    
    const validRows = previewData.filter(r => r._status === 'valid');
    const endpoint = importType === 'articoli' ? '/api/articles' : '/api/clients';

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });
        
        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          if (data.error && data.error.toLowerCase().includes('già esistente')) {
            duplicateCount++;
          } else {
            errorCount++;
          }
        }
      } catch (e) {
        errorCount++;
      }
      
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }
    
    setSummary({
      success: successCount,
      errors: errorCount + previewData.filter(r => r._status === 'error').length,
      duplicates: duplicateCount
    });
    
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Importazione Dati</h2>
          <p className="text-slate-500 mt-1">Importa articoli o clienti da file Excel o CSV</p>
        </div>
        {step > 1 && step < 4 && (
          <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">
            Annulla e ricomincia
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 ${step >= s ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => setImportType('articoli')}
              className={`flex-1 py-4 rounded-xl border-2 transition-all ${importType === 'articoli' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
              <span className="font-semibold">Importa Articoli</span>
            </button>
            <button
              onClick={() => setImportType('clienti')}
              className={`flex-1 py-4 rounded-xl border-2 transition-all ${importType === 'clienti' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
            >
              <Users className="w-8 h-8 mx-auto mb-2" />
              <span className="font-semibold">Importa Clienti</span>
            </button>
          </div>

          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Trascina il file qui oppure clicca per sfogliare</h3>
            <p className="text-slate-500 text-sm">Supporta .xlsx, .xls, .csv</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls,.csv,.docx"
              onChange={handleFileSelect}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-4">Mappa le colonne del file con i campi del database</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentFields.map(field => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    className="border border-slate-300 rounded-md p-2 text-sm"
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="">-- Ignora / Non mappare --</option>
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
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              Avanti <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Anteprima Dati ({previewData.length} righe)</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-600"><CheckCircle className="w-4 h-4" /> {previewData.filter(r => r._status === 'valid').length} Validi</span>
              <span className="flex items-center gap-1 text-red-600"><AlertCircle className="w-4 h-4" /> {previewData.filter(r => r._status === 'error').length} Errori</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 w-10">Stato</th>
                  {currentFields.map(f => <th key={f.key} className="px-4 py-3">{f.label}</th>)}
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, idx) => (
                  <tr key={idx} className={row._status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 text-center">
                      {row._status === 'error' ? <XCircle className="w-5 h-5 text-red-500 mx-auto" /> : <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />}
                    </td>
                    {currentFields.map(f => (
                      <td key={f.key} className="px-4 py-2 text-slate-700">{row[f.key] !== undefined ? String(row[f.key]) : '-'}</td>
                    ))}
                    <td className="px-4 py-2 text-red-600 text-xs font-medium">{row._errorMsg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              Le righe con errori verranno ignorate durante l'importazione.
            </p>
            <button 
              onClick={startImport}
              disabled={previewData.filter(r => r._status === 'valid').length === 0}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conferma e Importa
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="py-12 text-center space-y-6">
          {isImporting ? (
            <>
              <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto" />
              <h3 className="text-xl font-bold text-slate-800">Importazione in corso...</h3>
              <div className="w-full max-w-md mx-auto bg-slate-100 rounded-full h-4 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-slate-500">{progress}% completato</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Importazione Completata!</h3>
              
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-8">
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-3xl font-bold text-emerald-600">{summary.success}</div>
                  <div className="text-sm text-emerald-800 font-medium">Importati</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="text-3xl font-bold text-amber-600">{summary.duplicates}</div>
                  <div className="text-sm text-amber-800 font-medium">Duplicati ignorati</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="text-3xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-sm text-red-800 font-medium">Errori</div>
                </div>
              </div>

              <button 
                onClick={reset}
                className="mt-8 bg-slate-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-900 transition-colors"
              >
                Torna all'inizio
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

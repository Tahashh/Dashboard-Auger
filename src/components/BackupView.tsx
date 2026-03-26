import React, { useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const BackupView: React.FC = () => {
  const [uploading, setUploading] = useState(false);

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup/download';
    toast.success('Download del backup avviato');
  };

  const handleDownloadCSV = () => {
    window.location.href = '/api/movements/export/csv';
    toast.success('Download dei movimenti in CSV avviato');
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sqlite')) {
      toast.error('Il file deve essere un database SQLite (.sqlite)');
      return;
    }

    if (!window.confirm('ATTENZIONE: Questa operazione sovrascriverà tutti i dati attuali con quelli del backup. L\'applicazione verrà riavviata. Sei sicuro di voler procedere?')) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('db', file);

    try {
      const response = await fetch('/api/backup/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Backup ripristinato con successo. Riavvio in corso...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Errore durante il ripristino');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Errore durante il ripristino del backup');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Download className="h-6 w-6 text-indigo-600" />
            Salvataggio e Ripristino Dati
          </h2>
          <p className="text-slate-500 mt-1">
            Gestisci i backup del database per non perdere mai i tuoi dati.
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download Backup */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Scarica Backup Database</h3>
              <p className="text-sm text-slate-500 mt-1">
                Scarica una copia completa del database attuale (file .sqlite). Conservala in un luogo sicuro.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Scarica Backup (.sqlite)
            </button>
          </div>

          {/* Upload Backup */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 flex flex-col items-center text-center space-y-4">
            <div className="h-12 w-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Ripristina Backup</h3>
              <p className="text-sm text-slate-500 mt-1">
                Carica un file di backup (.sqlite) per ripristinare i dati. <strong className="text-red-600">Attenzione: i dati attuali verranno sovrascritti.</strong>
              </p>
            </div>
            <div className="mt-auto w-full flex justify-center">
              <label className={`cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Upload className="h-4 w-4" />
                {uploading ? 'Ripristino in corso...' : 'Carica Backup (.sqlite)'}
                <input
                  type="file"
                  accept=".sqlite"
                  className="hidden"
                  onChange={handleUploadBackup}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            Esportazione Fiscale
          </h2>
          <p className="text-slate-500 mt-1">
            Esporta i dati dei movimenti in formato CSV o Excel per il revisore fiscale.
          </p>
        </div>

        <div className="p-6">
          <div className="bg-green-50 rounded-lg p-6 border border-green-200 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Esporta Tutti i Movimenti (CSV)</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Scarica un file CSV contenente lo storico completo di tutti i movimenti registrati nel sistema. Il file può essere aperto direttamente con Excel.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="shrink-0 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Scarica Excel / CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackupView;

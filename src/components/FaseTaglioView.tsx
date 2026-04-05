import React, { useState, useEffect } from 'react';
import { Plus, Save, Printer, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { apiCall, addMacchina5000, addTaglioLaser } from '../api';
import { Article, FaseTaglio } from '../types';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';

interface FaseTaglioViewProps {
  articles: Article[];
  username: string;
  onUpdate?: () => void;
}

export default function FaseTaglioView({ articles, username, onUpdate }: FaseTaglioViewProps) {
  const isAndrea = username === 'Andrea';
  const isOsvaldo = username === 'Osvaldo';
  const isRestricted = isAndrea || isOsvaldo;

  const [rows, setRows] = useState<FaseTaglio[]>([]);
  const [archiveRows, setArchiveRows] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'archivio-stampe' | 'programmi-eseguiti'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineFormData, setInlineFormData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    lavorazione_per: '',
    articolo: '',
    quantita: 1,
    data: new Date().toISOString().split('T')[0],
    fatto: 0,
    odl: '',
    commessa: '',
    macchina: 'Macchina 5000' as 'Macchina 5000' | 'Taglio Laser' | 'Reparto Saldatura'
  });

  const fetchRows = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await apiCall<FaseTaglio[]>('/api/fase-taglio');
      console.log('API response:', data);
      setRows(data);
    } catch (error) {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const loadData = () => {
    if (viewMode === 'active') {
      fetchRows();
    } else {
      fetchArchiveRows(viewMode);
    }
  };

  useEffect(() => {
    if (viewMode === 'active') {
      fetchRows();
    } else {
      fetchArchiveRows(viewMode);
    }
  }, [viewMode]);

  const fetchArchiveRows = async (mode: 'archivio-stampe' | 'programmi-eseguiti') => {
    setIsLoading(true);
    try {
      const data = await apiCall<any[]>(`/api/${mode}`);
      setArchiveRows(data);
    } catch (error) {
      toast.error('Errore nel caricamento dell\'archivio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('FormData to save:', formData);
    if (!formData.lavorazione_per || !formData.articolo || formData.quantita <= 0 || !formData.data) {
      toast.error('Compila tutti i campi correttamente');
      return;
    }

    try {
      if (editingId) {
        await apiCall(`/api/fase-taglio/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        toast.success('Riga aggiornata');
      } else {
        await apiCall('/api/fase-taglio', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        toast.success('Riga aggiunta');
      }
      
      setEditingId(null);
      setFormData({
        lavorazione_per: '',
        articolo: '',
        quantita: 1,
        data: new Date().toISOString().split('T')[0],
        fatto: 0,
        odl: '',
        commessa: '',
        macchina: 'Macchina 5000'
      });
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    }
  };

  const handleEdit = (row: FaseTaglio) => {
    setEditingId(row.id);
    setFormData({
      lavorazione_per: row.lavorazione_per,
      articolo: row.articolo,
      quantita: row.quantita,
      data: row.data,
      fatto: row.fatto,
      odl: row.odl || '',
      commessa: row.commessa || '',
      macchina: row.macchina || 'Macchina 5000'
    });
  };

  const handleToggleStampato = async (row: FaseTaglio, forceValue?: number, skipFetch?: boolean) => {
    const newValue = forceValue !== undefined ? forceValue : (row.stampato === 1 ? 0 : 1);
    
    // Aggiornamento ottimistico della UI
    setRows(prevRows => prevRows.map(r => r.id === row.id ? { ...r, stampato: newValue } : r));

    try {
      await apiCall(`/api/fase-taglio/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...row, stampato: newValue })
      });
      if (!skipFetch) {
        fetchRows();
      }
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
      if (!skipFetch) {
        fetchRows(); // revert in caso di errore
      }
    }
  };

  const archiveStampa = async (row: FaseTaglio) => {
    try {
      await apiCall('/api/archivio-stampe', {
        method: 'POST',
        body: JSON.stringify(row)
      });
    } catch (error) {
      console.error('Errore archiviazione stampa', error);
    }
  };

  const archiveProgrammaEseguito = async (row: FaseTaglio) => {
    try {
      await apiCall('/api/programmi-eseguiti', {
        method: 'POST',
        body: JSON.stringify(row)
      });
    } catch (error) {
      console.error('Errore archiviazione programma', error);
    }
  };

  const handleToggleFatto = async (row: FaseTaglio) => {
    const isChecking = row.fatto === 0;
    
    if (isChecking && row.stampato !== 1) {
      const confirm = window.confirm('ATTENZIONE: Stai cercando di segnare come "Fatto" un programma che NON è stato stampato.\n\nSei sicuro di voler procedere e archiviare in "Programmi eseguiti" senza aver stampato e archiviato in "Archivio stampe"?');
      if (!confirm) return;
    }

    try {
      const newValue = row.fatto === 1 ? 0 : 1;
      await apiCall(`/api/fase-taglio/${row.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...row, fatto: newValue })
      });
      
      if (newValue === 1) {
        await archiveProgrammaEseguito(row);
        
        // AUTOMAZIONE: Aggiungi a Macchina 5000 o Taglio Laser
        try {
          const machineData = {
            data: new Date().toISOString().split('T')[0],
            articolo: row.articolo,
            quantita: row.quantita,
            preparazione: 0,
            inizio: null,
            inizio2: null,
            pausa: null,
            fine: null,
            totale_tempo: null,
            odl: (row as any).odl || null,
            stato: 'da tagliare',
            operatore: null,
            cliente: row.lavorazione_per || null,
            commessa: row.commessa || null
          };

          if (row.macchina === 'Taglio Laser') {
            await addTaglioLaser(machineData);
            toast.success('Inviato a Taglio Laser');
          } else {
            await addMacchina5000(machineData);
            toast.success('Inviato a Macchina 5000');
          }
        } catch (err) {
          console.error('Errore invio alla macchina', err);
          toast.error('Errore invio alla macchina');
        }
      }
      
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa riga?')) return;
    try {
      await apiCall(`/api/fase-taglio/${id}`, { method: 'DELETE' });
      toast.success('Riga eliminata');
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const handleInlineEditStart = (row: FaseTaglio) => {
    setInlineEditingId(row.id);
    setInlineFormData({ ...row });
  };

  const handleInlineSave = async () => {
    if (!inlineFormData) return;
    try {
      await apiCall(`/api/fase-taglio/${inlineFormData.id}`, {
        method: 'PUT',
        body: JSON.stringify(inlineFormData)
      });
      toast.success('Dati salvati nel database');
      setInlineEditingId(null);
      setInlineFormData(null);
      fetchRows();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const [selectedRows, setSelectedRows] = useState<FaseTaglio[]>([]);

  const toggleSelection = (row: FaseTaglio) => {
    if (selectedRows.find(r => r.id === row.id)) {
      setSelectedRows(selectedRows.filter(r => r.id !== row.id));
    } else {
      setSelectedRows([...selectedRows, row]);
    }
  };

  const handlePrintSelected = () => {
    if (selectedRows.length === 0) {
      toast.error('Seleziona almeno una lavorazione');
      return;
    }
    printRows(selectedRows);
  };

  const printRows = (rowsToPrint: FaseTaglio[]) => {
    // Update stampato status and archive immediately
    if (viewMode === 'active') {
      const updatePromises = [];
      for (const row of rowsToPrint) {
        if (row.stampato !== 1) {
          updatePromises.push(handleToggleStampato(row, 1, true));
          archiveStampa(row);
        }
      }
      if (updatePromises.length > 0) {
        Promise.all(updatePromises).then(() => {
          fetchRows();
        });
      }
    }

    const win = window.open("", "_blank");
    if (!win) {
      toast.error('Permetti i popup per stampare');
      return;
    }

    const renderRow = (row: FaseTaglio) => {
      console.log('Printing row:', row);
      const articleData = articles.find(a => a.nome === row.articolo);
      const isSpecial = !articleData;
      const codice = articleData ? articleData.codice : 'SPECIALE';
      
      // Barcode: Codice o Descrizione (se speciale)
      const rawBarcodeValue = isSpecial ? row.articolo : (codice !== 'N/A' ? codice : row.articolo);
      // Remove non-ASCII characters to avoid CODE128 errors
      const safeBarcodeValue = rawBarcodeValue.replace(/[^\x20-\x7E]/g, "") || "SPECIALE";

      const barcodeCanvasCodice = document.createElement('canvas');
      try {
        JsBarcode(barcodeCanvasCodice, safeBarcodeValue, {
          format: "CODE128",
          width: 4,
          height: 80,
          displayValue: false
        });
      } catch (e) {
        console.error("Barcode error:", e);
        JsBarcode(barcodeCanvasCodice, "ERROR", { format: "CODE128", width: 4, height: 80, displayValue: false });
      }
      const barcodeCodiceUrl = barcodeCanvasCodice.toDataURL("image/png");

      // Barcode: ODL
      const odlValue = row.odl || 'N/A';
      const barcodeCanvasOdl = document.createElement('canvas');
      JsBarcode(barcodeCanvasOdl, odlValue, {
        format: "CODE128",
        width: 3,
        height: 50,
        displayValue: false
      });
      const barcodeOdlUrl = barcodeCanvasOdl.toDataURL("image/png");

      return `
        <div class="label">
          <div class="header-top">
            <div class="title-section">
              <h1 style="font-size: 48px; font-weight: bold;">${codice}</h1>
              <p style="font-size: 20px;">${row.articolo}</p>
            </div>
            <div class="date-section">
              <p>DATA: ${row.data && !isNaN(new Date(row.data).getTime()) ? new Date(row.data).toLocaleDateString('it-IT') : '-'}</p>
            </div>
          </div>
          <div class="info-section">
            <p>${row.lavorazione_per}</p>
            <p>COMMESSA: ${row.commessa || 'Nessuna'}</p>
          </div>
          <div class="barcode-section">
            <p>B. CODE ARTICOLO</p>
            <div class="barcode"><img src="${barcodeCodiceUrl}" /></div>
          </div>
          <div class="footer-section">
            <div class="qty-section">
              <p>QTÀ</p>
              <h1 style="font-size: 48px; font-weight: bold;">${row.quantita}</h1>
            </div>
            <div class="odl-section">
              <p>NUMERO ODL</p>
              <div class="barcode"><img src="${barcodeOdlUrl}" /></div>
            </div>
          </div>
        </div>
      `;
    };

    win.document.write(`
      <html>
        <head>
          <title>Stampa Etichette</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; width: 210mm; height: 297mm; }
            .page-wrapper { 
              display: flex; 
              flex-direction: column; 
              height: 100%; 
              padding: 10mm; 
              box-sizing: border-box;
            }
            .label { 
              width: 190mm; 
              height: 90mm; 
              border: 1px solid black; 
              display: grid;
              grid-template-rows: auto auto 1fr auto;
              box-sizing: border-box;
              margin: 0 auto 5mm auto;
              padding: 5px;
            }
            .header-top { display: flex; justify-content: space-between; border-bottom: 1px solid black; padding: 2px; }
            .title-section h1 { font-size: 20px; font-weight: bold; margin: 0; }
            .title-section p { font-size: 14px; margin: 0; }
            .date-section { font-weight: bold; font-size: 14px; }
            .info-section { text-align: center; border-bottom: 1px solid black; padding: 2px 0; }
            .info-section p { margin: 0; font-weight: bold; font-size: 16px; }
            .barcode-section { text-align: center; border-bottom: 1px solid black; padding: 2px; }
            .barcode-section p { margin: 0; font-size: 12px; font-weight: bold; }
            .barcode-section img { height: 50px; }
            .footer-section { display: grid; grid-template-columns: 1fr 1fr; }
            .qty-section { border-right: 1px solid black; text-align: center; }
            .qty-section p { margin: 0; font-size: 12px; font-weight: bold; }
            .qty-section h1 { margin: 0; font-size: 48px; font-weight: bold; }
            .odl-section { text-align: center; }
            .odl-section p { margin: 0; font-size: 12px; font-weight: bold; }
            .odl-section img { height: 40px; }
          </style>
        </head>
        <body>
          <div class="page-wrapper">
            ${rowsToPrint.map((row, index) => {
              const html = renderRow(row);
              if (index > 0 && index % 3 === 0) {
                return `<div style="break-before: page;"></div>${html}`;
              }
              return html;
            }).join('')}
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handlePrint = (row: FaseTaglio) => {
    printRows([row]);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Fase Taglio Attiva
          </button>
          <button
            onClick={() => setViewMode('archivio-stampe')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === 'archivio-stampe' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Archivio Stampe
          </button>
          <button
            onClick={() => setViewMode('programmi-eseguiti')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${viewMode === 'programmi-eseguiti' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Programmi Eseguiti
          </button>
        </div>
        <button
          onClick={() => loadData()}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          title="Aggiorna dati"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {viewMode === 'active' ? (
        <>
          {!isRestricted && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="h-6 w-6 text-blue-500" />
                {editingId ? 'Modifica Riga' : 'Nuova Riga Taglio'}
              </h2>
          
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lavorazione per</label>
                  <input
                    type="text"
                    value={formData.lavorazione_per}
                    onChange={(e) => setFormData({ ...formData, lavorazione_per: e.target.value })}
                    placeholder="Es. Nome cliente o Magazzino"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    list="lavorazione-suggestions"
                  />
                  <datalist id="lavorazione-suggestions">
                    <option value="Magazzino" />
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Articolo</label>
                  <input
                    type="text"
                    value={formData.articolo}
                    onChange={(e) => setFormData({ ...formData, articolo: e.target.value })}
                    placeholder="Seleziona o scrivi articolo"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    list="articles-list"
                  />
                  <datalist id="articles-list">
                    {articles.map(a => (
                      <option key={a.id} value={a.nome}>{a.codice}</option>
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Q.Tà</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantita}
                    onChange={(e) => setFormData({ ...formData, quantita: parseInt(e.target.value) || 1 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ODL</label>
                  <input
                    type="text"
                    value={formData.odl}
                    onChange={(e) => setFormData({ ...formData, odl: e.target.value })}
                    placeholder="Numero ODL"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commessa</label>
                  <input
                    type="text"
                    value={formData.commessa}
                    onChange={(e) => setFormData({ ...formData, commessa: e.target.value })}
                    placeholder="Numero Commessa"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Macchina</label>
                  <select
                    value={formData.macchina}
                    onChange={(e) => setFormData({ ...formData, macchina: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Macchina 5000">Macchina 5000</option>
                    <option value="Taglio Laser">Taglio Laser</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={handlePrintSelected}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" /> Stampa Selezionati ({selectedRows.length})
                </button>
                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setFormData({
                          lavorazione_per: '',
                          articolo: '',
                          quantita: 1,
                          data: new Date().toISOString().split('T')[0],
                          fatto: 0,
                          odl: '',
                          commessa: '',
                          macchina: 'Macchina 5000'
                        });
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <X className="h-4 w-4" /> Annulla
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" /> {editingId ? 'Aggiorna' : 'Salva'}
                  </button>
                </div>
              </div>
            </div>
          )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Data & Ora</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Seleziona</th>
                  <th className="px-6 py-4 border-b border-slate-200">Lavorazione per</th>
                  <th className="px-6 py-4 border-b border-slate-200">Commessa</th>
                  <th className="px-6 py-4 border-b border-slate-200">Macchina</th>
                  <th className="px-6 py-4 border-b border-slate-200">Articolo</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Q.Tà</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">ODL</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Data</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Fatto</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-slate-500">
                      Nessuna registrazione presente
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isInlineEditing = inlineEditingId === row.id;
                    const isDeveloper = username === 'TahaDev';

                    if (isInlineEditing && isDeveloper) {
                      return (
                        <tr key={row.id} className="bg-blue-50">
                          <td className="px-6 py-4 text-center text-[10px] font-mono text-slate-500">
                            {row.created_at ? new Date(row.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input type="checkbox" disabled className="h-5 w-5 opacity-50" />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={inlineFormData.lavorazione_per}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, lavorazione_per: e.target.value })}
                              className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={inlineFormData.commessa}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, commessa: e.target.value })}
                              className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={inlineFormData.macchina}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, macchina: e.target.value })}
                              className="w-full border border-blue-300 rounded px-1 py-1 text-sm"
                            >
                              <option value="Macchina 5000">Macchina 5000</option>
                              <option value="Taglio Laser">Taglio Laser</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={inlineFormData.articolo}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, articolo: e.target.value })}
                              className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                              list="articles-list"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="number"
                              value={inlineFormData.quantita}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, quantita: parseInt(e.target.value) || 0 })}
                              className="w-16 border border-blue-300 rounded px-1 py-1 text-sm text-center"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="text"
                              value={inlineFormData.odl}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, odl: e.target.value })}
                              className="w-full border border-blue-300 rounded px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input
                              type="date"
                              value={inlineFormData.data}
                              onChange={(e) => setInlineFormData({ ...inlineFormData, data: e.target.value })}
                              className="w-full border border-blue-300 rounded px-1 py-1 text-sm"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.fatto ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {row.fatto ? 'SÌ' : 'NO'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleInlineSave}
                                className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                                title="Conferma e Salva"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setInlineEditingId(null); setInlineFormData(null); }}
                                className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                                title="Annulla"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                    <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${row.fatto ? 'bg-emerald-50' : ''}`}>
                      <td className="px-6 py-4 text-center text-[10px] font-mono text-slate-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={!!selectedRows.find(r => r.id === row.id)}
                          onChange={() => toggleSelection(row)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{row.lavorazione_per}</td>
                      <td className="px-6 py-4 text-slate-600">{row.commessa || ''}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          row.macchina === 'Taglio Laser' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {row.macchina || 'Macchina 5000'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{row.articolo}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{row.quantita}</td>
                      <td className="px-6 py-4 text-center text-slate-600">{row.odl || '-'}</td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {row.data && !isNaN(new Date(row.data).getTime()) ? new Date(row.data).toLocaleDateString('it-IT') : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {username === 'RidaTecnico' ? (
                          <input
                            type="checkbox"
                            checked={row.fatto === 1}
                            onChange={() => handleToggleFatto(row)}
                            className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                          />
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.fatto ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {row.fatto ? 'SÌ' : 'NO'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                            <button
                              onClick={() => handlePrint(row)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="Stampa"
                            >
                              <Printer className="h-5 w-5" />
                            </button>
                            <input
                              type="checkbox"
                              checked={row.stampato === 1}
                              onChange={() => handleToggleStampato(row)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                              title="Stampato"
                            />
                          </div>
                          {(!isRestricted || isDeveloper) && (
                            <>
                              <button
                                onClick={() => isDeveloper ? handleInlineEditStart(row) : handleEdit(row)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              {viewMode === 'archivio-stampe' ? 'Archivio Stampe' : 'Programmi Eseguiti'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">Data Archiviazione</th>
                  <th className="px-6 py-4 border-b border-slate-200">Lavorazione per</th>
                  <th className="px-6 py-4 border-b border-slate-200">Commessa</th>
                  <th className="px-6 py-4 border-b border-slate-200">Macchina</th>
                  <th className="px-6 py-4 border-b border-slate-200">ODL</th>
                  <th className="px-6 py-4 border-b border-slate-200">Articolo</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Q.Tà</th>
                  <th className="px-6 py-4 border-b border-slate-200 text-center">Data Originale</th>
                  {viewMode === 'archivio-stampe' && (
                    <th className="px-6 py-4 border-b border-slate-200 text-center">Azioni</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archiveRows.length === 0 ? (
                  <tr>
                    <td colSpan={viewMode === 'archivio-stampe' ? 9 : 8} className="px-6 py-8 text-center text-slate-500">
                      Nessuna registrazione presente in archivio
                    </td>
                  </tr>
                ) : (
                  archiveRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">
                        {row.data_archiviazione && !isNaN(new Date(row.data_archiviazione).getTime()) ? new Date(row.data_archiviazione).toLocaleString('it-IT') : '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">{row.lavorazione_per}</td>
                      <td className="px-6 py-4 text-slate-600">{row.commessa || ''}</td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          row.macchina === 'Taglio Laser' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {row.macchina || 'Macchina 5000'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row.odl || ''}</td>
                      <td className="px-6 py-4 text-slate-600">{row.articolo}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-800">{row.quantita}</td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {row.data && !isNaN(new Date(row.data).getTime()) ? new Date(row.data).toLocaleDateString('it-IT') : '-'}
                      </td>
                      {viewMode === 'archivio-stampe' && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handlePrint(row)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ristampa"
                          >
                            <Printer className="h-5 w-5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { fetchCGialle, fetchMovimentiCGialla, addMovimentoCGialla, addCGialle } from '../api';
import { toast } from 'react-hot-toast';
import { Loader2, RefreshCw, Plus, Save, Clock, History, LayoutTemplate } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export default function CGialleView({ username }: { username: string }) {
  const [cgialle, setCgialle] = useState<any[]>([]);
  const [movimenti, setMovimenti] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'principale' | 'movimenti' | 'registra' | 'avanzamento'>('principale');
  
  // States for new movement
  const [newArticolo, setNewArticolo] = useState('');
  const [newFase, setNewFase] = useState('Taglio');
  const [newFaseRichiesta, setNewFaseRichiesta] = useState('Taglio');
  const [newQuantita, setNewQuantita] = useState<number | ''>('');
  const [newCliente, setNewCliente] = useState('');
  const [newCommessa, setNewCommessa] = useState('');
  const [newTempo, setNewTempo] = useState<number | ''>('');
  const [newMese, setNewMese] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [cgData, movData] = await Promise.all([
        fetchCGialle(),
        fetchMovimentiCGialla()
      ]);
      setCgialle(cgData);
      setMovimenti(movData);
    } catch (error: any) {
      toast.error('Errore durante il caricamento dei dati: ' + error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRegistraImpegno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticolo || !newQuantita || !newCliente || !newCommessa || !newMese || !newFaseRichiesta) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    try {
      await addCGialle({
        articolo_spc: newArticolo,
        fase_richiesta: newFaseRichiesta,
        quantita: Number(newQuantita),
        cliente: newCliente,
        commessa: newCommessa,
        mese: newMese,
        note: newNote,
        operatore: username
      });
      toast.success('Impegno speciale registrato con successo');
      
      setNewArticolo('');
      setNewQuantita('');
      setNewCliente('');
      setNewCommessa('');
      setNewMese('');
      setNewNote('');
      setNewFaseRichiesta('Taglio');
      
      loadData(true);
      setActiveTab('principale');
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleAvanzamento = async (item: any, fase: string) => {
    try {
      await addMovimentoCGialla({
        articolo_spc: item.articolo_spc,
        fase: fase,
        quantita: item.quantita,
        cliente: item.cliente,
        commessa: item.commessa,
        operatore: username,
        tempo_min: null,
        data_reg: new Date().toISOString()
      });
      toast.success(`Avanzamento a ${fase} registrato con successo`);
      loadData(true);
    } catch (error: any) {
      toast.error('Errore durante l\'avanzamento: ' + error.message);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticolo || !newQuantita || !newFase || !newCliente || !newCommessa) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    try {
      await addMovimentoCGialla({
        articolo_spc: newArticolo,
        fase: newFase,
        quantita: Number(newQuantita),
        cliente: newCliente,
        commessa: newCommessa,
        operatore: username,
        tempo_min: newTempo ? Number(newTempo) : null,
        data_reg: new Date().toISOString()
      });
      toast.success('Movimento registrato con successo');
      
      setNewArticolo('');
      setNewQuantita('');
      setNewCliente('');
      setNewCommessa('');
      setNewTempo('');
      
      loadData(true);
    } catch (error: any) {
      toast.error('Errore: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">C. Gialle</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('principale')}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === 'principale' ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <LayoutTemplate className="w-4 h-4" />
            Tabella Principale
          </button>
          <button
            onClick={() => setActiveTab('registra')}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === 'registra' ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Plus className="w-4 h-4" />
            Registra Impegni SPC
          </button>
          <button
            onClick={() => setActiveTab('avanzamento')}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === 'avanzamento' ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Avanzamento Prod. SPC
          </button>
          <button
            onClick={() => setActiveTab('movimenti')}
            className={clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              activeTab === 'movimenti' ? "bg-amber-100 text-amber-800" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <History className="w-4 h-4" />
            Movimenti
          </button>
          <button 
            onClick={() => loadData()}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="font-semibold">Aggiorna</span>
          </button>
        </div>
      </div>

      {activeTab === 'principale' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b text-center font-semibold">Data Reg.</th>
                  <th className="px-4 py-3 border-b font-semibold">Articolo SPC.</th>
                  <th className="px-4 py-3 border-b text-center font-semibold">Fase Richiesta</th>
                  <th className="px-4 py-3 border-b text-center font-semibold text-amber-600">Quantità</th>
                  <th className="px-4 py-3 border-b font-semibold">Cliente</th>
                  <th className="px-4 py-3 border-b font-semibold">Commessa</th>
                  <th className="px-4 py-3 border-b font-semibold">Operatore</th>
                  <th className="px-4 py-3 border-b text-center font-semibold">Tempo (min)</th>
                  <th className="px-4 py-3 border-b text-center font-semibold text-blue-600">Mese</th>
                  <th className="px-4 py-3 border-b font-semibold">Note</th>
                  <th className="px-4 py-3 border-b text-center font-semibold bg-indigo-50">Stato</th>
                  <th className="px-4 py-3 border-b text-center font-semibold">Ultimo Agg.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {cgialle.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato. I record vengono creati automaticamente quando si registra un movimento o si crea un impegno.
                    </td>
                  </tr>
                ) : (
                  cgialle.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-center text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(item.data_reg), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-800">{item.articolo_spc}</td>
                      <td className="px-4 py-2 text-center text-indigo-600 font-semibold">{item.fase_richiesta}</td>
                      <td className="px-4 py-2 font-mono text-center font-bold text-amber-600">
                        {item.quantita}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{item.cliente || '-'}</td>
                      <td className="px-4 py-2 font-mono text-sm">{item.commessa || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{item.operatore || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {item.tempo_min ? (
                          <span className="flex items-center justify-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3" />
                            {item.tempo_min}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-2 text-center text-blue-700 font-bold">{item.mese || '-'}</td>
                      <td className="px-4 py-2 text-slate-600 text-xs max-w-[150px] truncate" title={item.note}>{item.note || '-'}</td>
                      <td className="px-4 py-2 text-center font-bold bg-indigo-50/50">
                        {item.stato === 'Tagliato' && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">Tagliato</span>}
                        {item.stato === 'Piegato' && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">Piegato</span>}
                        {item.stato === 'Saldato' && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full text-xs">Saldato</span>}
                        {item.stato === 'Verniciato' && <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-xs">Verniciato</span>}
                        {item.stato === 'Iniziato' && <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-xs">Iniziato</span>}
                        {!['Tagliato','Piegato','Saldato','Verniciato','Iniziato'].includes(item.stato) && (
                           <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-xs">{item.stato}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(item.data_aggiornamento), 'dd/MM/yyyy HH:mm')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movimenti' && (
        <div className="flex gap-6">
          <div className="flex-[2] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 text-white px-4 py-3 shrink-0">
              <h3 className="font-bold uppercase tracking-wider text-sm">Storico Movimenti</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-b text-center font-semibold">Data Reg.</th>
                    <th className="px-4 py-3 border-b font-semibold">Articolo SPC.</th>
                    <th className="px-4 py-3 border-b text-center font-semibold">Fase</th>
                    <th className="px-4 py-3 border-b text-center font-semibold text-amber-600">Quantità</th>
                    <th className="px-4 py-3 border-b font-semibold">Cliente</th>
                    <th className="px-4 py-3 border-b font-semibold">Commessa</th>
                    <th className="px-4 py-3 border-b font-semibold">Operatore</th>
                    <th className="px-4 py-3 border-b text-center font-semibold">Tempo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {movimenti.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        Nessun movimento registrato.
                      </td>
                    </tr>
                  ) : (
                    movimenti.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-center text-xs text-slate-500 whitespace-nowrap">
                          {format(new Date(item.data_reg), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-800">{item.articolo_spc}</td>
                        <td className="px-4 py-2 text-center font-semibold text-indigo-600">{item.fase}</td>
                        <td className="px-4 py-2 font-mono text-center font-bold text-amber-600">{item.quantita}</td>
                        <td className="px-4 py-2 text-slate-700">{item.cliente || '-'}</td>
                        <td className="px-4 py-2 font-mono text-sm">{item.commessa || '-'}</td>
                        <td className="px-4 py-2 text-slate-600">{item.operatore || '-'}</td>
                        <td className="px-4 py-2 text-center">
                          {item.tempo_min ? (
                            <span className="flex items-center justify-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              {item.tempo_min}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Nuovo Movimento
            </h3>
            
            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Articolo SPC.</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase"
                  value={newArticolo}
                  onChange={(e) => setNewArticolo(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fase Comunque</label>
                <select
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={newFase}
                  onChange={(e) => setNewFase(e.target.value)}
                >
                  <option value="Taglio">Taglio</option>
                  <option value="Piega">Piega</option>
                  <option value="Saldatura">Saldatura</option>
                  <option value="Verniciatura">Verniciatura</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quantità</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    value={newQuantita}
                    onChange={(e) => setNewQuantita(Number(e.target.value) || '')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tempo (min) - Opz.</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    value={newTempo}
                    onChange={(e) => setNewTempo(Number(e.target.value) || '')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase"
                  value={newCliente}
                  onChange={(e) => setNewCliente(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Commessa</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={newCommessa}
                  onChange={(e) => setNewCommessa(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <Save className="w-5 h-5" />
                Registra Movimento
              </button>
            </form>
          </div>
        </div>
      )}
      {activeTab === 'avanzamento' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-indigo-600" />
            Seleziona la Commessa da Avanzare
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cgialle.filter(c => !['Completato', 'Verniciato'].includes(c.stato)).map(item => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase">{item.cliente}</span>
                    <h3 className="text-lg font-bold text-slate-800 mt-2">{item.articolo_spc}</h3>
                  </div>
                  <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded-lg text-slate-600 border border-slate-200">
                    {item.commessa}
                  </span>
                </div>
                
                <div className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{item.note}</div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="text-sm">
                    <span className="text-slate-500">Stato attuale:</span>
                    <span className="ml-2 font-bold text-slate-800">{item.stato}</span>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap justify-end">
                    {['Iniziato'].includes(item.stato) && (
                      <button 
                        onClick={() => handleAvanzamento(item, 'Taglio')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Completa Taglio
                      </button>
                    )}
                    {['Tagliato', 'Iniziato'].includes(item.stato) && (
                      <button 
                        onClick={() => handleAvanzamento(item, 'Piega')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Completa Piega
                      </button>
                    )}
                    {['Piegato', 'Tagliato', 'Iniziato'].includes(item.stato) && (
                      <button 
                        onClick={() => handleAvanzamento(item, 'Saldatura')}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Completa Saldatura
                      </button>
                    )}
                    {['Saldato', 'Piegato', 'Tagliato', 'Iniziato'].includes(item.stato) && (
                      <button 
                        onClick={() => handleAvanzamento(item, 'Verniciatura')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      >
                        Completa Vernic.
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {cgialle.filter(c => !['Completato', 'Verniciato'].includes(c.stato)).length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <RefreshCw className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                Nessun impegni speciale da avanzare al momento.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'registra' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-indigo-600" />
            Registra Impegno Speciale
          </h2>
          <form onSubmit={handleRegistraImpegno} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  value={newCliente}
                  onChange={(e) => setNewCliente(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Commessa</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newCommessa}
                  onChange={(e) => setNewCommessa(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mese</label>
                <input
                  type="month"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newMese}
                  onChange={(e) => setNewMese(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fase di Produzione Richiesta</label>
                <select
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={newFaseRichiesta}
                  onChange={(e) => setNewFaseRichiesta(e.target.value)}
                >
                  <option value="Taglio">Taglio</option>
                  <option value="Piega">Piega</option>
                  <option value="Saldatura">Saldatura</option>
                  <option value="Verniciatura">Verniciatura</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Articolo SPC</label>
                <input
                  type="text"
                  required
                  placeholder="Es. CASSA INOX 400x500"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  value={newArticolo}
                  onChange={(e) => setNewArticolo(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Quantità</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                  value={newQuantita}
                  onChange={(e) => setNewQuantita(Number(e.target.value) || '')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Note Aggiuntive</label>
              <textarea
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                placeholder="Inserisci eventuali note o indicazioni di produzione..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2 mt-4"
            >
              <Save className="w-5 h-5" />
              Salva Impegno SPC
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

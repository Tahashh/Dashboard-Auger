import React, { useState, useMemo } from 'react';
import { Article, Process, Commitment } from '../types';
import { getDisponibilita } from '../utils';
import { Search, Package, Edit2, CheckCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { updateArticle, updateProcess } from '../api';
import { toast } from 'react-hot-toast';

interface StruttureAGMViewProps {
  articles: Article[];
  processes: Process[];
  commitments: Commitment[];
  onUpdate: () => void;
}

export default function StruttureAGMView({ articles, processes, commitments, onUpdate }: StruttureAGMViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    saldatura: 0,
    verniciati: 0,
    impegni_clienti: 0,
    scorta: 0
  });

  const foTtArticles = useMemo(() => {
    return articles.filter(a => a.codice.startsWith('AGM-FO') || a.codice.startsWith('AGM-TT'));
  }, [articles]);

  const fianchiArticles = useMemo(() => {
    return articles.filter(a => a.codice.startsWith('AGM') && a.codice.endsWith('PL'));
  }, [articles]);

  const struttureArticles = useMemo(() => {
    return articles.filter(a => a.codice.startsWith('AGM') && a.codice.endsWith('PR'));
  }, [articles]);

  const filteredFoTt = useMemo(() => {
    return foTtArticles.filter(a => 
      a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.codice.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.codice.localeCompare(b.codice));
  }, [foTtArticles, searchQuery]);

  const filteredFianchi = useMemo(() => {
    return fianchiArticles.filter(a => 
      a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.codice.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.codice.localeCompare(b.codice));
  }, [fianchiArticles, searchQuery]);

  const filteredStrutture = useMemo(() => {
    return struttureArticles.filter(a => 
      a.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.codice.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      // Sort by dimensions to match the original table order
      const matchA = a.nome.match(/(\d+)X(\d+)X(\d+)/i);
      const matchB = b.nome.match(/(\d+)X(\d+)X(\d+)/i);
      if (matchA && matchB) {
        const wA = parseInt(matchA[1]);
        const wB = parseInt(matchB[1]);
        if (wA !== wB) return wA - wB;
        const hA = parseInt(matchA[2]);
        const hB = parseInt(matchB[2]);
        if (hA !== hB) return hA - hB;
        const dA = parseInt(matchA[3]);
        const dB = parseInt(matchB[3]);
        return dA - dB;
      }
      return a.nome.localeCompare(b.nome);
    });
  }, [struttureArticles, searchQuery]);

  type TableType = 'strutture' | 'fott' | 'fianchi';

  const handleEdit = (article: Article, type: TableType = 'strutture') => {
    const process = processes.find(p => p.articolo_id === article.id);
    setEditingId(article.id);
    setFormData({
      saldatura: type === 'strutture' ? (process?.saldatura || 0) : (process?.piega || 0),
      verniciati: article.verniciati || 0,
      impegni_clienti: article.impegni_clienti || 0,
      scorta: article.scorta || 0
    });
  };

  const handleSave = async (id: string, type: TableType = 'strutture') => {
    try {
      const article = articles.find(a => a.id === id);
      const process = processes.find(p => p.articolo_id === id);
      if (!article) return;

      await updateArticle(id, {
        nome: article.nome,
        codice: article.codice,
        verniciati: formData.verniciati,
        impegni_clienti: formData.impegni_clienti,
        scorta: formData.scorta
      });

      if (process) {
        await updateProcess(process.id, {
          ...process,
          saldatura: type === 'strutture' ? formData.saldatura : process.saldatura,
          piega: type !== 'strutture' ? formData.saldatura : process.piega // We reuse formData.saldatura for piega in FO/TT/Fianchi
        });
      }

      toast.success('Articolo aggiornato con successo');
      setEditingId(null);
      onUpdate();
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento');
      console.error(error);
    }
  };

  const renderRow = (article: Article, type: TableType = 'strutture') => {
    const process = processes.find(p => p.articolo_id === article.id);
    const saldati = process?.saldatura || 0;
    const piega = process?.piega || 0;
    const taglio = process?.taglio || 0;
    const verniciati = article.verniciati || 0;
    const impegni = article.impegni_clienti || 0;
    const scorta = article.scorta || 0;
    
    const tot = verniciati - impegni;
    const isEditing = editingId === article.id;
    
    return (
      <tr key={article.id} className="h-12 hover:bg-slate-50 transition-colors">
        <td className="border-b border-r border-slate-200 p-1 text-center">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-700">{article.nome || '-'}</span>
            <span className="text-[9px] text-slate-400 font-mono">{article.codice || '-'}</span>
          </div>
        </td>
        <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[10px] text-slate-500">
          {article.codice}
        </td>

        {type === 'strutture' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura}
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{saldati}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.verniciati}
                  onChange={(e) => setFormData({ ...formData, verniciati: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{verniciati}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-amber-600 font-bold">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.impegni_clienti}
                  onChange={(e) => setFormData({ ...formData, impegni_clienti: parseInt(e.target.value) || 0 })}
                />
              ) : (
                impegni
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
            <td className={clsx(
              "border-b border-r border-slate-200 p-1 text-center font-mono text-xs font-bold",
              tot < 0 ? "text-white bg-red-500" : "text-blue-600"
            )}>
              {tot}
            </td>
          </>
        )}

        {type === 'fott' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {taglio}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura} // Using saldatura state for piega
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{piega}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-xs text-amber-600 font-bold">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.impegni_clienti}
                  onChange={(e) => setFormData({ ...formData, impegni_clienti: parseInt(e.target.value) || 0 })}
                />
              ) : (
                impegni
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
          </>
        )}

        {type === 'fianchi' && (
          <>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {taglio}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.saldatura} // Using saldatura state for piega
                  onChange={(e) => setFormData({ ...formData, saldatura: parseInt(e.target.value) || 0 })}
                />
              ) : (
                <span className="text-[11px] font-mono">{piega}</span>
              )}
            </td>
            <td className="border-b border-r border-slate-200 p-1 text-center font-mono text-[11px]">
              {isEditing ? (
                <input
                  type="number"
                  className="w-full text-center border rounded p-0.5 text-[10px]"
                  value={formData.scorta}
                  onChange={(e) => setFormData({ ...formData, scorta: parseInt(e.target.value) || 0 })}
                />
              ) : (
                scorta
              )}
            </td>
          </>
        )}

        <td className="border-b border-slate-200 p-1 text-center">
          {isEditing ? (
            <div className="flex justify-center gap-1">
              <button onClick={() => handleSave(article.id, type)} className="text-green-600 hover:text-green-800">
                <Save className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => handleEdit(article, type)} className="text-blue-600 hover:text-blue-800">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Strutture AGM e Componenti</h1>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-12rem)]">
        {/* Table 1: Strutture AGM */}
        <div className="flex-[1.5] min-w-[600px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">STRUTTURE AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center w-64">Articolo</th>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Codice</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Saldati">SALD.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Verniciati">VER.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12 text-amber-600" title="Impegni Clienti">IMP.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Totale (Disponibilità)">TOT</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStrutture.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredStrutture.map(article => renderRow(article, 'strutture'))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Fondi e Tetti */}
        <div className="flex-1 min-w-[400px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">FONDI E TETTI AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center w-64">Articolo</th>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Codice</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Taglio">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Piega">PIEGA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12 text-amber-600" title="Impegni Clienti">IMP.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFoTt.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredFoTt.map(article => renderRow(article, 'fott'))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Fianchi AGM */}
        <div className="flex-1 min-w-[350px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="bg-slate-800 text-white px-4 py-3 shrink-0 rounded-t-xl">
            <h3 className="font-bold uppercase tracking-wider text-sm text-center">FIANCHI AGM</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center w-64">Articolo</th>
                  <th className="px-3 py-2 font-semibold border-b border-r border-slate-300 text-center">Codice</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Taglio">TAG.</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Piega">PIEGA</th>
                  <th className="px-1 py-2 font-semibold border-b border-r border-slate-300 text-center w-12" title="Scorta">SCORTA</th>
                  <th className="px-1 py-2 font-semibold border-b border-slate-300 text-center w-12">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFianchi.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nessun articolo trovato
                    </td>
                  </tr>
                ) : (
                  filteredFianchi.map(article => renderRow(article, 'fianchi'))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

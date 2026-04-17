import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';

interface StdRow {
  id: string;
  cliente: string;
  articolo: string;
  taglio: string;
  piega: string;
  saldato: string;
  vern: string;
  impegnati: string;
  nuova: string;
  note: string;
}

const initialData: string[][] = [
  ["ZOCCOLO STAGNO","BASAMENTO UNICO STAGNO L600 P600","","","2","","","",""],
  ["ZOCCOLO STAGNO","BASAMENTO UNICO STAGNO L800 P600","","","","","","",""],
  ["ZOCCOLO STAGNO","BASAMENTO UNICO STAGNO L1000 P600","","","4","","","",""],
  ["ZOCCOLO STAGNO","BASAMENTO UNICO STAGNO L1200 P600","","","","","","",""],
  ["ZOCCOLO STAGNO","BASAMENTO UNICO STAGNO L1600 P600","","","","","","",""],
  ["","BASAMENTO UNICO STAGNO L600 P500","","","","","","",""],
  ["","BASAMENTO UNICO STAGNO L1000 P500","","","","","","",""],
  ["","BASAMENTO UNICO STAGNO L1200 P500","","","","","","",""],
  ["","BASAMENTO UNICO STAGNO L1400 P500","","","","","","",""],
  ["AEPI","DEFLETTORE","","0","","","0","",""],
  ["BELTRAME","TRAVERSINO A FILO H56 P600 - SX","","","","","","","impegni quantità doppia"],
  ["BELTRAME","AG-MIC12018 MOD ING CAVI L1200","","2","","","","",""],
  ["BELTRAME","AG-MIC10018 MOD ING CAVI L1000","","1","","","","",""],
  ["CONVEL","RINFORZO DIVISORIO P600","","19","3","","16","",""],
  ["CONVEL","TETTO 1000X800 FORATO","","2","","","","",""],
  ["CONVEL","PIASTRA INS FRONT 800X1400","","0","","","0","",""],
  ["CORA","PIANTANE H2000 7035","","","0","","","",""],
  ["CORA","PORTA 600X1800","","","1","","","",""],
  ["CTS","AGM L1200 H800 P400","","","1","","","",""],
  ["EL.101","AD2215","","","1","","1","",""],
  ["EL. TREVIGIANA","AG-PO0620IB","","","2","","2","",""],
  ["EGAP","TRAVERSINO TETTO H81 L1000","","24","","","","",""],
  ["ELMAR","LATERALE H2000 P600","","","0","","0","",""],
  ["ELECRAIMPIANTI","INVOLUCRO AT-IN3415","","","1","","","",""],
  ["ENG AUT","AG-PO0820","","","8","","","",""],
  ["EUROCONTROLLI","AG-PX0420IB","","3","","","","",""],
  ["EUROCONTROLLI","AG-PX0420CB","","3","","","","",""],
  ["EURO EL","AT5725 STACCABATTERIE","","","1","","1","",""],
  ["FCM","COPPIA OMEGA L1200","","","","","0","",""],
  ["FCM","PIASTRA ING CAVI","","0","0","2","","0","",""],
  ["FIMI","RANELLA ZOCCOLO","","","80","56","24","",""],
  ["FIMI","PIASTRA AGLM L1400","","1","","","","",""],
  ["FIGESCO","PIATTO 48X48","","30","","","","0","",""],
  ["FRIGERIO","SUPPORTO RESISTENZA","","0","0","0","16","16","",""],
  ["FRIGERIO","INVOLUCRO ALZATA","","0","8","1","0","0","",""],
  ["FRIGERIO","PANNELLO RETRO","","0","0","9","0","0","",""],
  ["ICE","AT-PO0305_000001","30","","","","","",""],
  ["INT","OMEGA UNIONE INOX","","14","","","","",""],
  ["INT","M","","1","","","","",""],
  ["LAZZATI","AGR0604TCR","","","1","","","",""],
  ["LOGIMATIC","RINFORZO BERNSTEIN","5","","","","","",""],
  ["LOGIMATIC","TETTO ARMADIO 1600","","","","0","","",""],
  ["LOGIMATIC","TETTO ARMADIO 1200","","","","0","","",""],
  ["LOGIMATIC","TETTO ARMADIO 800","","","","0","","",""],
  ["LOGIMATIC","TETTO ARMADIO 600","","","","0","","",""],
  ["LOMBARDI","FLANGIA LATERALE","","","2","","2","",""],
  ["MAICOPRESSE","ANTINA PLEXI GRANDE","","0","13","","","0","",""],
  ["MAICOPRESSE","ANTINA PLEXI PICCOLA","","2","","","0","",""],
  ["MAICOPRESSE","CAVALLOTTO PIASTRA","","20","","","","",""],
  ["MEP","PIASTRA CONNETTORI","","1","","","","",""],
  ["NEXT TRE","AG-PO1018","","5","","","","",""],
  ["RIVACOLD","TEGOLINI 1200","","1","","1","-1","",""],
  ["PME","PORTA 400X500","","","30","25","","",""],
  ["PRISMA","PORTA AD 200X400","10","","","","","",""],
  ["RC ELETTRICA","AGR2005L","","","2","","","",""],
  ["SEA DI MORA","RINFORZO PIASTRA","","11","","","","",""],
  ["SIPA","PIANTANE H900","","67","","","","",""],
  ["TECHNOALPIN","PORTA 600X1800","","8","","","","0","",""],
  ["TECNOSTEEL","PORTA VETRO 600X600","","50","","","","",""],
  ["TENTORI","AGLM L1000","","","3","","","",""],
  ["TIESSE ROBOT","FINESTRELLA","","0","4","2","","","INVENTARIO"],
  ["TIESSE ROBOT","SUPPORTO MONITOR","","5","1","4","","",""],
  ["TIESSE ROBOT","RIPIANO FISSO","","0","","2","2","0","",""],
  ["TOSA","AT6825","","","2","","2","",""],
  ["VINATI","RETE ANTINSETTO","","3","","","","",""],
  ["ZANONI","PORTA 800X2000","","","","0","","","INVENTARIO"],
  ["STANDARD","PARADITA H2000","","","0","","0","",""],
  ["IDRA","BASE LEGGIO","","","","0","","",""],
  ["FUTURA","PORTA L600","","","","0","","",""]
];

export default function StdModificatoView() {
  const [rows, setRows] = useState<StdRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('stdModificatoData');
    if (saved) {
      try {
        setRows(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved data", e);
        initializeData();
      }
    } else {
      initializeData();
    }
  }, []);

  const initializeData = () => {
    const initialRows: StdRow[] = initialData.map((row, index) => ({
      id: `row-${Date.now()}-${index}`,
      cliente: row[0] || '',
      articolo: row[1] || '',
      taglio: row[2] || '',
      piega: row[3] || '',
      saldato: row[4] || '',
      vern: row[5] || '',
      impegnati: row[6] || '',
      nuova: row[7] || '',
      note: row[8] || ''
    }));
    
    // Add 15 empty rows
    for (let i = 0; i < 15; i++) {
      initialRows.push({
        id: `empty-${Date.now()}-${i}`,
        cliente: '',
        articolo: '',
        taglio: '',
        piega: '',
        saldato: '',
        vern: '',
        impegnati: '',
        nuova: '',
        note: ''
      });
    }
    
    setRows(initialRows);
    localStorage.setItem('stdModificatoData', JSON.stringify(initialRows));
  };

  const saveRows = (newRows: StdRow[]) => {
    setRows(newRows);
    localStorage.setItem('stdModificatoData', JSON.stringify(newRows));
  };

  const handleAddRow = () => {
    const newRow: StdRow = {
      id: `new-${Date.now()}`,
      cliente: '',
      articolo: '',
      taglio: '',
      piega: '',
      saldato: '',
      vern: '',
      impegnati: '',
      nuova: '',
      note: ''
    };
    saveRows([newRow, ...rows]);
  };

  const handleAddRowAfter = (id: string) => {
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return;

    const newRow: StdRow = {
      id: `new-${Date.now()}`,
      cliente: rows[index].cliente, // Copy the same client name
      articolo: '',
      taglio: '',
      piega: '',
      saldato: '',
      vern: '',
      impegnati: '',
      nuova: '',
      note: ''
    };

    const newRows = [...rows];
    newRows.splice(index + 1, 0, newRow);
    saveRows(newRows);
  };

  const handleDeleteRow = (id: string) => {
    saveRows(rows.filter(r => r.id !== id));
  };

  const handleChange = (id: string, field: keyof StdRow, value: string) => {
    const newRows = rows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    saveRows(newRows);
  };

  const filteredRows = rows.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (row.cliente || '').toLowerCase().includes(searchLower) ||
      (row.articolo || '').toLowerCase().includes(searchLower) ||
      (row.note || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800">STANDARD MODIFICATO</h2>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Aggiungi</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 border-r border-slate-200 w-[150px]">CLIENTE</th>
                <th className="px-4 py-3 border-r border-slate-200 w-[350px]">ARTICOLO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#c6efce] w-[60px]">TAGLIO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#e0e0e0] w-[60px]">PIEGA</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#f4cccc] w-[60px]">SALDATO</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#fce5cd] w-[60px]">VERN</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#fff2cc] w-[60px]">IMPEGNATI</th>
                <th className="px-2 py-3 border-r border-slate-200 bg-[#b6d7a8] w-[60px]">NUOVA G.</th>
                <th className="px-4 py-3 border-r border-slate-200 w-[200px]">NOTE</th>
                <th className="px-4 py-3 text-center w-12">X</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="border-r border-slate-200 p-0">
                    <div className="flex items-center w-full h-full">
                      <input 
                        type="text" 
                        value={row.cliente} 
                        onChange={(e) => handleChange(row.id, 'cliente', e.target.value)}
                        className="flex-grow h-full px-2 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none"
                      />
                      <button 
                        onClick={() => handleAddRowAfter(row.id)}
                        className="p-1 text-blue-500 hover:bg-blue-100 rounded mr-1"
                        title="Aggiungi riga sotto"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.articolo} 
                      onChange={(e) => handleChange(row.id, 'articolo', e.target.value)}
                      className="w-full h-full px-4 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.taglio} 
                      onChange={(e) => handleChange(row.id, 'taglio', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.piega} 
                      onChange={(e) => handleChange(row.id, 'piega', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.saldato} 
                      onChange={(e) => handleChange(row.id, 'saldato', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.vern} 
                      onChange={(e) => handleChange(row.id, 'vern', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.impegnati} 
                      onChange={(e) => handleChange(row.id, 'impegnati', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.nuova} 
                      onChange={(e) => handleChange(row.id, 'nuova', e.target.value)}
                      className="w-full h-full px-1 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none text-center"
                    />
                  </td>
                  <td className="border-r border-slate-200 p-0">
                    <input 
                      type="text" 
                      value={row.note} 
                      onChange={(e) => handleChange(row.id, 'note', e.target.value)}
                      className="w-full h-full px-2 py-2.5 bg-transparent border-none focus:ring-2 focus:ring-inset focus:ring-blue-500 outline-none"
                    />
                  </td>
                  <td className="p-0 text-center">
                    <button 
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mx-auto"
                      title="Elimina riga"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Nessun risultato trovato
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

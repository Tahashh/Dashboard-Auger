import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const articles = db.prepare("SELECT nome, codice FROM articles").all() as any[];
  
  const getCategory = (name: string, code?: string): string => {
    const upperName = name?.toUpperCase() || '';
    const upperCode = code?.toUpperCase() || '';
    
    if (upperName.includes('TETTO') && !upperName.includes('STT AGR') && !upperName.includes('STRUTTURA AGM') && !upperCode.includes('AGM-TT')) return 'Tetti';
    return 'Altro';
  };

  const tetti = articles.filter(a => getCategory(a.nome, a.codice) === 'Tetti');
  console.log('Tetti found:', tetti.length);
  tetti.forEach(t => console.log(`${t.nome} - ${t.codice}`));
} catch (e) {
  console.error(e);
}

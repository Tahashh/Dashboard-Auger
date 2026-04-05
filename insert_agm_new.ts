import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  "STRUTTURA AGM 600X1200X400,0,0,0,1,0",
  "STRUTTURA AGM 600X1600X400,1,0,3,3,-3",
  "STRUTTURA AGM 600X1800X400,0,0,3,0,-3",
  "STRUTTURA AGM 600X1800X500,0,0,1,0,-1",
  "STRUTTURA AGM 600X2000X400,0,0,0,1,0",
  "STRUTTURA AGM 600X2000X500,0,0,2,0,-2",
  "STRUTTURA AGM 800X1200X400,0,0,0,1,0",
  "STRUTTURA AGM 800X1400X400,0,0,0,1,0",
  "STRUTTURA AGM 800X1600X400,0,0,3,1,-3",
  "STRUTTURA AGM 800X1800X400,-4,0,3,-1,-3",
  "STRUTTURA AGM 800X1800X500,0,0,1,0,-1",
  "STRUTTURA AGM 800X2000X400,0,0,2,0,-2",
  "STRUTTURA AGM 800X2000X500,0,0,0,1,-1",
  "STRUTTURA AGM 1000X1600X400,0,0,3,2,-3",
  "STRUTTURA AGM 1000X1600X500,0,0,1,0,-1",
  "STRUTTURA AGM 1000X1800X400,0,0,3,1,-3",
  "STRUTTURA AGM 1000X1800X500,0,0,2,0,-2",
  "STRUTTURA AGM 1000X2000X400,0,0,3,0,-3",
  "STRUTTURA AGM 1000X2000X500,0,2,1,0,1",
  "STRUTTURA AGM 1200X800X400,0,2,2,0,0",
  "STRUTTURA AGM 1200X1000X400,0,1,1,-1,0",
  "STRUTTURA AGM 1200X1200X400,0,0,1,0,-1",
  "STRUTTURA AGM 1200X1800X400,1,1,1,0,0",
  "STRUTTURA AGM 1200X2000X400,0,0,0,0,0",
  "STRUTTURA AGM 1200X2000X500,0,0,0,0,0",
  "STRUTTURA AGM 1400X800X400,0,0,0,0,0",
  "STRUTTURA AGM 1400X1000X400,0,1,0,0,1",
  "STRUTTURA AGM 1400X1200X500,0,1,1,-1,0",
  "STRUTTURA AGM 1600X800X400,0,0,0,0,0",
  "STRUTTURA AGM 1600X1000X400,0,0,0,0,0",
  "STRUTTURA AGM 1600X1200X500,0,0,0,0,0",
  "STRUTTURA AGM 1600X1600X400,0,0,0,0,0",
  "STRUTTURA AGM 1600X2000X500,0,0,0,0,0",
  "STRUTTURA AGM 1800X800X400,0,0,0,0,0",
  "STRUTTURA AGM 1800X1000X400,0,0,0,0,0",
  "STRUTTURA AGM 2000X1200X400,0,0,0,0,0",
  "STRUTTURA AGM 2000X1200X500,0,0,0,0,0"
];

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, piega, verniciati, impegni_clienti, scorta) VALUES (?, ?, ?, ?, ?, ?)');
const updateArticle = db.prepare('UPDATE articles SET piega = ?, verniciati = ?, impegni_clienti = ?, scorta = ? WHERE codice = ?');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const row of data) {
    const parts = row.split(',');
    const nome = parts[0].trim();
    const grezzi = parseInt(parts[1].trim()) || 0;
    const verniciati = parseInt(parts[2].trim()) || 0;
    const impegni = parseInt(parts[3].trim()) || 0;
    const scorta = parseInt(parts[4].trim()) || 0;
    
    // Extract dimensions
    const match = nome.match(/(\d+)X(\d+)X(\d+)/i);
    if (!match) continue;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    const d = parseInt(match[3]);
    
    const wCode = (w / 100).toString().padStart(2, '0');
    const hCode = (h / 100).toString().padStart(2, '0');
    const dCode = (d / 100).toString().padStart(2, '0');
    
    const codice = `AGM${wCode}${hCode}${dCode}PR`;
    
    try {
      const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(codice);
      if (existing) {
        updateArticle.run(grezzi, verniciati, impegni, scorta, codice);
        console.log(`Updated: ${nome} - ${codice}`);
      } else {
        const info = insertArticle.run(nome, codice, grezzi, verniciati, impegni, scorta);
        insertProcess.run(info.lastInsertRowid);
        console.log(`Inserted: ${nome} - ${codice}`);
      }
    } catch (e) {
      console.error(`Error with ${nome}:`, e);
    }
  }
})();

console.log("Done inserting Strutture AGM.");

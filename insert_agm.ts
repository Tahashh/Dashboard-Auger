import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  { nome: "STRUTTURA AGM 600X1200X400", gre: 0, ver: 0, imp: 0, scorta: 1 },
  { nome: "STRUTTURA AGM 600X1600X400", gre: 1, ver: 0, imp: 3, scorta: 3 },
  { nome: "STRUTTURA AGM 600X1800X400", gre: 0, ver: 0, imp: 3, scorta: 0 },
  { nome: "STRUTTURA AGM 600X1800X500", gre: 0, ver: 0, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 600X2000X400", gre: 0, ver: 0, imp: 0, scorta: 1 },
  { nome: "STRUTTURA AGM 600X2000X500", gre: 0, ver: 0, imp: 2, scorta: 0 },
  { nome: "STRUTTURA AGM 800X1200X400", gre: 0, ver: 0, imp: 0, scorta: 1 },
  { nome: "STRUTTURA AGM 800X1400X400", gre: 0, ver: 0, imp: 0, scorta: 1 },
  { nome: "STRUTTURA AGM 800X1600X400", gre: 0, ver: 0, imp: 3, scorta: 1 },
  { nome: "STRUTTURA AGM 800X1800X400", gre: -4, ver: 0, imp: 3, scorta: -1 },
  { nome: "STRUTTURA AGM 800X1800X500", gre: 0, ver: 0, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 800X2000X400", gre: 0, ver: 0, imp: 2, scorta: 0 },
  { nome: "STRUTTURA AGM 800X2000X500", gre: 0, ver: 0, imp: 0, scorta: 1 },
  { nome: "STRUTTURA AGM 1000X1600X400", gre: 0, ver: 0, imp: 3, scorta: 2 },
  { nome: "STRUTTURA AGM 1000X1600X500", gre: 0, ver: 0, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 1000X1800X400", gre: 0, ver: 0, imp: 3, scorta: 1 },
  { nome: "STRUTTURA AGM 1000X1800X500", gre: 0, ver: 0, imp: 2, scorta: 0 },
  { nome: "STRUTTURA AGM 1000X2000X400", gre: 0, ver: 0, imp: 3, scorta: 0 },
  { nome: "STRUTTURA AGM 1000X2000X500", gre: 0, ver: 2, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 1200X800X400", gre: 0, ver: 2, imp: 2, scorta: 0 },
  { nome: "STRUTTURA AGM 1200X1000X400", gre: 0, ver: 1, imp: 1, scorta: -1 },
  { nome: "STRUTTURA AGM 1200X1200X400", gre: 0, ver: 0, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 1200X1800X400", gre: 1, ver: 1, imp: 1, scorta: 0 },
  { nome: "STRUTTURA AGM 1200X2000X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1200X2000X500", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1400X800X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1400X1000X400", gre: 0, ver: 1, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1400X1200X500", gre: 0, ver: 1, imp: 1, scorta: -1 },
  { nome: "STRUTTURA AGM 1600X800X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1600X1000X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1600X1200X500", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1600X1600X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1600X2000X500", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1800X800X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 1800X1000X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 2000X1200X400", gre: 0, ver: 0, imp: 0, scorta: 0 },
  { nome: "STRUTTURA AGM 2000X1200X500", gre: 0, ver: 0, imp: 0, scorta: 0 }
];

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta) VALUES (?, ?, ?, ?, ?, ?)');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const item of data) {
    // Extract dimensions
    const match = item.nome.match(/(\d+)X(\d+)X(\d+)/);
    if (!match) continue;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    const d = parseInt(match[3]);
    
    const wCode = (w / 100).toString().padStart(2, '0');
    const hCode = (h / 100).toString().padStart(2, '0');
    const dCode = (d / 100).toString().padStart(2, '0');
    
    const codice = `AGM${wCode}${hCode}${dCode}`;
    
    try {
      const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(codice);
      if (!existing) {
        const info = insertArticle.run(item.nome, codice, item.ver, item.imp, item.gre, item.scorta);
        insertProcess.run(info.lastInsertRowid);
        console.log(`Inserted: ${item.nome} - ${codice}`);
      } else {
        db.prepare('UPDATE articles SET verniciati = ?, impegni_clienti = ?, piega = ?, scorta = ? WHERE codice = ?').run(item.ver, item.imp, item.gre, item.scorta, codice);
        console.log(`Updated: ${item.nome} - ${codice}`);
      }
    } catch (e) {
      console.error(`Error with ${item.nome}:`, e);
    }
  }
})();

console.log("Done inserting AGM.");

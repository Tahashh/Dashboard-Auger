import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  "400X2000",
  "400X2200",
  "500X1000",
  "500X1200",
  "600X1800",
  "600X2000",
  "800X1000",
  "800X2000",
  "800X2200"
];

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta) VALUES (?, ?, 0, 0, 0, 10)');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const dim of data) {
    const nome = `PANN. LATERALE IBRIDO ${dim}`;
    
    // Extract dimensions
    const match = dim.match(/(\d+)X(\d+)/i);
    if (!match) continue;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    
    const wCode = (w / 100).toString().padStart(2, '0');
    const hCode = (h / 100).toString().padStart(2, '0');
    
    const codice = `AGR${wCode}${hCode}LB`;
    
    try {
      const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(codice);
      if (!existing) {
        const info = insertArticle.run(nome, codice);
        insertProcess.run(info.lastInsertRowid);
        console.log(`Inserted: ${nome} - ${codice}`);
      } else {
        console.log(`Already exists: ${nome} - ${codice}`);
      }
    } catch (e) {
      console.error(`Error with ${nome}:`, e);
    }
  }
})();

console.log("Done inserting Laterali Ibridi.");

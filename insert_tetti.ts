import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  "400x300",
  "400x400",
  "400X500",
  "300x500",
  "300x600",
  "600x400",
  "600x500",
  "600x600",
  "800x400",
  "800x500",
  "800x600",
  "800x800",
  "1000x400",
  "1000x500",
  "1000x600",
  "1000x800",
  "1000x1000",
  "1200x400",
  "1200x500",
  "1200x600",
  "1200x800",
  "1200x1000",
  "1400X400",
  "1400x500",
  "1400x600",
  "1400x800",
  "1400x1000",
  "1600x400",
  "1600x500",
  "1600x600",
  "1600x800",
  "1600x1000"
];

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta) VALUES (?, ?, 0, 0, 0, 10)');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const item of data) {
    // Extract dimensions
    const match = item.toUpperCase().match(/(\d+)X(\d+)/);
    if (!match) continue;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    
    // Calculate code parts (e.g., 400 -> 04, 300 -> 03)
    const wCode = (w / 100).toString().padStart(2, '0');
    const hCode = (h / 100).toString().padStart(2, '0');
    
    const nome = `PANN. TETTO AGR ${item.toUpperCase()}`;
    const codice = `AGR${wCode}${hCode}TT`;
    
    try {
      const info = insertArticle.run(nome, codice);
      insertProcess.run(info.lastInsertRowid);
      console.log(`Inserted: ${nome} - ${codice}`);
    } catch (e: any) {
      console.log(`Skipped (maybe exists): ${nome} - ${codice} (${e.message})`);
    }
  }
})();

console.log("Done inserting tetti.");

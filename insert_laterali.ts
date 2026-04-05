import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  "250X1800",
  "300x1600",
  "300x1800",
  "400x1000",
  "400x1200",
  "400x1400",
  "400x1600",
  "400x1800",
  "400x2000",
  "400x2200",
  "500x1000",
  "500x1200",
  "500x1400",
  "500x1600",
  "500x1800",
  "500x2000",
  "500X2000 TOSA",
  "500x2200",
  "600X1000",
  "600X1200",
  "600x1400",
  "600x1600",
  "600x1800",
  "600x2000",
  "600X2000 ZANONI",
  "600x2200",
  "800X1000",
  "800x1200",
  "800x1400",
  "800x1600",
  "800x1800",
  "800x2000",
  "800x2200",
  "1000X1200",
  "1000x1800",
  "1000x2000",
  "1000x2200",
  "1200x1000",
  "1200x2000"
];

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta) VALUES (?, ?, 0, 0, 0, 10)');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const item of data) {
    const isTosa = item.toUpperCase().includes('TOSA');
    const isZanoni = item.toUpperCase().includes('ZANONI');
    
    // Extract dimensions
    const match = item.toUpperCase().match(/(\d+)X(\d+)/);
    if (!match) continue;
    
    const w = parseInt(match[1]);
    const h = parseInt(match[2]);
    
    const wCode = (w / 10).toString().padStart(3, '0');
    const hCode = (h / 100).toString().padStart(2, '0');
    
    let suffix = '';
    if (isTosa) suffix = ' TOSA';
    if (isZanoni) suffix = ' ZANONI';
    
    const nome = `Pann. Laterale ${item.toLowerCase()}`;
    const codice = `AGR${wCode}${hCode}L${suffix}`;
    
    try {
      const info = insertArticle.run(nome, codice);
      insertProcess.run(info.lastInsertRowid);
      console.log(`Inserted: ${nome} - ${codice}`);
    } catch (e) {
      console.log(`Skipped (maybe exists): ${nome} - ${codice}`);
    }
  }
})();

console.log("Done");

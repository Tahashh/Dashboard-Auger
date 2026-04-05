import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const codes = [
  'AGM0604PL', 'AGM0804PL', 'AGM1004PL', 'AGM1005PL', 'AGM1204PL', 
  'AGM1205PL', 'AGM1404PL', 'AGM1604PL', 'AGM1605PL', 'AGM1804PL', 
  'AGM1805PL', 'AGM2004PL', 'AGM2005PL'
];

try {
  db.transaction(() => {
    for (const code of codes) {
      const h = parseInt(code.substring(3, 5)) * 100;
      const d = parseInt(code.substring(5, 7)) * 100;
      const nome = `FIANCO AGM ${h}X${d}`;
      
      // Check if exists
      const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(code);
      if (!existing) {
        const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta, prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)');
        const info = stmt.run(nome, code, 0, 0, 0, 20, 0);
        
        const processStmt = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, ?, ?, ?, ?)');
        processStmt.run(info.lastInsertRowid, 0, 0, 0, 0);
        console.log(`Inserted: ${nome} - ${code}`);
      } else {
        console.log(`Skipped (already exists): ${nome} - ${code}`);
      }
    }
    console.log('Successfully inserted FIANCHI AGM articles.');
  })();
} catch (error) {
  console.error('Migration failed:', error);
}

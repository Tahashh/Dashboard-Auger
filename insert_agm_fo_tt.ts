import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const data = [
  { code: 'AGM-FO0604', tag: 0, piega: 24, imp: 3, scorta: 5 },
  { code: 'AGM-TT0604', tag: 0, piega: 24, imp: 3, scorta: 5 },
  { code: 'AGM-FO0605', tag: 0, piega: 3, imp: 0, scorta: 5 },
  { code: 'AGM-TT0605', tag: 0, piega: 3, imp: 0, scorta: 5 },
  { code: 'AGM-FO0804', tag: 0, piega: 9, imp: 6, scorta: 5 },
  { code: 'AGM-TT0804', tag: 0, piega: 9, imp: 6, scorta: 5 },
  { code: 'AGM-FO0805', tag: 0, piega: 9, imp: 2, scorta: 5 },
  { code: 'AGM-TT0805', tag: 0, piega: 9, imp: 2, scorta: 5 },
  { code: 'AGM-FO1004', tag: 0, piega: 24, imp: 6, scorta: 5 },
  { code: 'AGM-TT1004', tag: 0, piega: 24, imp: 6, scorta: 5 },
  { code: 'AGM-FO1005', tag: 0, piega: 8, imp: 0, scorta: 2 },
  { code: 'AGM-TT1005', tag: 0, piega: 8, imp: 0, scorta: 2 },
  { code: 'AGM-FO1204', tag: 0, piega: 4, imp: 1, scorta: 2 },
  { code: 'AGM-TT1204', tag: 0, piega: 4, imp: 1, scorta: 2 },
  { code: 'AGM-FO1205', tag: 0, piega: 1, imp: 0, scorta: 2 },
  { code: 'AGM-TT1205', tag: 0, piega: 1, imp: 0, scorta: 2 },
  { code: 'AGM-FO1404', tag: 0, piega: 0, imp: 0, scorta: 0 },
  { code: 'AGM-TT1404', tag: 0, piega: 0, imp: 0, scorta: 0 },
  { code: 'AGM-FO1405', tag: 0, piega: 0, imp: 0, scorta: 0 },
  { code: 'AGM-TT1405', tag: 0, piega: 0, imp: 0, scorta: 0 },
  { code: 'AGM-FO1604', tag: 0, piega: 3, imp: 2, scorta: 0 },
  { code: 'AGM-TT1604', tag: 0, piega: 3, imp: 2, scorta: 0 },
  { code: 'AGM-FO1605', tag: 0, piega: 2, imp: 0, scorta: 0 },
  { code: 'AGM-TT1605', tag: 0, piega: 2, imp: 0, scorta: 0 },
  { code: 'AGM-FO1804', tag: 0, piega: 2, imp: 2, scorta: 0 },
  { code: 'AGM-TT1804', tag: 0, piega: 2, imp: 2, scorta: 0 },
  { code: 'AGM-FO1805', tag: 0, piega: 3, imp: 0, scorta: 0 },
  { code: 'AGM-TT1805', tag: 0, piega: 3, imp: 0, scorta: 0 },
  { code: 'AGM-FO2004', tag: 0, piega: 2, imp: 0, scorta: 0 },
  { code: 'AGM-TT2004', tag: 0, piega: 2, imp: 0, scorta: 0 },
  { code: 'AGM-FO2005', tag: 0, piega: 0, imp: 0, scorta: 0 },
  { code: 'AGM-TT2005', tag: 0, piega: 0, imp: 0, scorta: 0 }
];

try {
  db.transaction(() => {
    for (const item of data) {
      const nome = item.code.replace('AGM-FO', 'FONDO AGM ').replace('AGM-TT', 'TETTO AGM ');
      
      const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta, prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(nome, item.code, 0, item.imp, 0, item.scorta, 0);
      
      const processStmt = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, ?, ?, ?, ?)');
      processStmt.run(info.lastInsertRowid, item.tag, item.piega, 0, 0);
    }
    console.log('Successfully inserted FO and TT articles.');
  })();
} catch (error) {
  console.error('Migration failed:', error);
}

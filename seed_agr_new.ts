import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const codiciValidi = [
"AGR0304","AGR0305","AGR0306","AGR0404","AGR0405","AGR0406","AGR0408","AGR0410",
"AGR0604","AGR0605","AGR0606","AGR0608","AGR0610",
"AGR0804","AGR0805","AGR0806","AGR0808","AGR0810",
"AGR1004","AGR1005","AGR1006","AGR1008","AGR1010",
"AGR1204","AGR1205","AGR1206","AGR1208","AGR1210","AGR1212",
"AGR1404","AGR1405","AGR1406","AGR1408","AGR1410",
"AGR1604","AGR1605","AGR1606","AGR1608","AGR1610",
"AGR1804","AGR1805","AGR1806"
];

const transaction = db.transaction(() => {
  // 1. Clean up existing AGR articles to ensure consistency
  db.prepare("DELETE FROM articles WHERE codice LIKE 'AGR%'").run();
  
  for (const code of codiciValidi) {
    const misura = code.replace('AGR', '');
    const w = parseInt(misura.substring(0, 2)) * 100;
    const h = parseInt(misura.substring(2)) * 100;
    const dim = `${w}X${h}`;
    
    // Insert Complete Structure
    const artId = db.prepare("INSERT INTO articles (nome, codice, famiglia, scorta) VALUES (?, ?, ?, ?)").run(
      `STRUTTURA AGR COMPLETA ${dim}`,
      code,
      'Strutture Agr',
      10
    ).lastInsertRowid;
    
    db.prepare("INSERT INTO processes (articolo_id) VALUES (?)").run(artId);
    
    // Insert Base Component
    const baseCode = `AGR-STB${misura}`;
    const baseId = db.prepare("INSERT INTO articles (nome, codice, famiglia, scorta) VALUES (?, ?, ?, ?)").run(
      `STT AGR BASE ${dim}`,
      baseCode,
      'Strutture Agr',
      10
    ).lastInsertRowid;
    
    db.prepare("INSERT INTO processes (articolo_id) VALUES (?)").run(baseId);
    
    // Insert Tetto Component
    const tettoCode = `AGR-STT${misura}`;
    const tettoId = db.prepare("INSERT INTO articles (nome, codice, famiglia, scorta) VALUES (?, ?, ?, ?)").run(
      `STT AGR TETTO ${dim}`,
      tettoCode,
      'Strutture Agr',
      10
    ).lastInsertRowid;
    
    db.prepare("INSERT INTO processes (articolo_id) VALUES (?)").run(tettoId);
  }
});

transaction();
console.log('Seeding completed successfully.');

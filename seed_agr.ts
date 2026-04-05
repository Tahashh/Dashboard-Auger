import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

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

const insertArticle = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta) VALUES (?, ?, 0, 0, 0, 0)');
const insertProcess = db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)');

db.transaction(() => {
  for (const code of codiciValidi) {
    // Master article
    const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(code);
    if (!existing) {
      const info = insertArticle.run(`STRUTTURA AGR ${code.replace('AGR', '')}`, code);
      insertProcess.run(info.lastInsertRowid);
    }

    // Components
    const misura = code.replace('AGR', '');
    const baseCode = `AGR-STB${misura}`;
    const tettoCode = `AGR-STT${misura}`;

    const existingBase = db.prepare('SELECT id FROM articles WHERE codice = ?').get(baseCode);
    if (!existingBase) {
      const info = insertArticle.run(`BASE STRUTTURA AGR ${misura}`, baseCode);
      insertProcess.run(info.lastInsertRowid);
    }

    const existingTetto = db.prepare('SELECT id FROM articles WHERE codice = ?').get(tettoCode);
    if (!existingTetto) {
      const info = insertArticle.run(`TETTO STRUTTURA AGR ${misura}`, tettoCode);
      insertProcess.run(info.lastInsertRowid);
    }
  }
})();

console.log('Seeded AGR articles');

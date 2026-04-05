import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const duplicates = db.prepare("SELECT id, codice FROM articles WHERE codice LIKE 'AGR-STT %' OR codice LIKE 'AGR-STB %'").all() as any[];
console.log(`Found ${duplicates.length} duplicates.`);

for (const dup of duplicates) {
  console.log(`Deleting ${dup.codice} (ID: ${dup.id})`);
  db.prepare("DELETE FROM articles WHERE id = ?").run(dup.id);
}

console.log('Done.');

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

const duplicates = db.prepare("SELECT codice, COUNT(*) as count FROM articles GROUP BY codice HAVING COUNT(*) > 1").all() as any[];
console.log(`Found ${duplicates.length} duplicate codes.`);
duplicates.forEach(d => console.log(`${d.codice}: ${d.count}`));

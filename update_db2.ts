import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

console.log('Altering c_gialle table...');

try {
  db.exec('ALTER TABLE c_gialle ADD COLUMN mese TEXT;');
} catch(e: any) {
  console.log(e.message);
}

try {
  db.exec('ALTER TABLE c_gialle ADD COLUMN note TEXT;');
} catch(e: any) {
  console.log(e.message);
}

console.log('Tables altered.');

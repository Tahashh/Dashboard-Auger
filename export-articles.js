import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

const rows = db.prepare('SELECT * FROM articles ORDER BY nome ASC').all();

let csvContent = 'ID,Nome,Codice,Verniciati,Scorta\n';
rows.forEach(row => {
  const nome = `"${row.nome.replace(/"/g, '""')}"`;
  const codice = `"${row.codice.replace(/"/g, '""')}"`;
  csvContent += `${row.id},${nome},${codice},${row.verniciati},${row.scorta}\n`;
});

fs.writeFileSync(path.join(__dirname, 'public', 'articoli.csv'), csvContent);
console.log('Exported ' + rows.length + ' articles to public/articoli.csv');

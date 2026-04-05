import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

const articles = db.prepare("SELECT nome, codice FROM articles WHERE codice LIKE 'AGR%'").all() as { nome: string, codice: string }[];
console.log('Current AGR articles:');
articles.forEach(a => console.log(`${a.codice}: ${a.nome}`));

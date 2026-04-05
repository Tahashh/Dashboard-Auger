import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

const articles = db.prepare("SELECT id, nome, codice, famiglia FROM articles WHERE codice LIKE 'AGR%' ORDER BY codice").all() as any[];
console.log('Current AGR articles:');
articles.forEach(a => console.log(`${a.id} | ${a.codice} | ${a.nome} | ${a.famiglia}`));

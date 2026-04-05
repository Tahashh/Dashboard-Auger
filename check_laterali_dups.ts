import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT id, nome, codice FROM articles WHERE nome LIKE 'PANN. LATERALE AGR%'").all());

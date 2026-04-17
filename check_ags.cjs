const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const rows = db.prepare("SELECT id, codice, nome FROM articles WHERE nome LIKE '%AGS%' LIMIT 10").all();
console.log(rows);

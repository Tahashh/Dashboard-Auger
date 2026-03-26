import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const rows = db.prepare("SELECT nome FROM articles WHERE nome LIKE '%RETRO%'").all();
console.log(`Found ${rows.length} articles with RETRO in name`);

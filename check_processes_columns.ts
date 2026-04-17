import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
const info = db.prepare("PRAGMA table_info(processes)").all();
console.log("PROCESSES COLUMNS:", info);

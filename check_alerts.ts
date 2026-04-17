import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("PRAGMA table_info(production_alerts)").all());

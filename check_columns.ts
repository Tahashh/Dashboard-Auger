import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
const info = db.prepare("PRAGMA table_info(commitments)").all();
console.log("COMMITMENTS COLUMNS:", info);

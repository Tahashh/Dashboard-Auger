import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all());

import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='piastre_at'").get());
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='porte_at'").get());
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='involucro_at'").get());

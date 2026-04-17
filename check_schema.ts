import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name='production_alerts'").get());

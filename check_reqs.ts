import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name='agr_requirements'").get());
console.log(db.prepare("SELECT * FROM agr_requirements LIMIT 5").all());

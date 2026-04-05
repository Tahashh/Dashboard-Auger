import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
console.log(db.prepare("SELECT * FROM traverse_inventory LIMIT 10").all());

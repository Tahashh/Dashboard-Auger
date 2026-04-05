import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
const articles = db.prepare('SELECT * FROM articles').all();
console.log('Articles count:', articles.length);

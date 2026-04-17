import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
try {
  const info = db.prepare("PRAGMA table_info(articles)").all();
  console.log("ARTICLES COLUMNS:", info);
} catch (e) {
  console.error("ERROR:", e);
}

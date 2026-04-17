import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
try {
  const info = db.prepare("PRAGMA table_info(processes)").all();
  console.log("PROCESSES COLUMNS:", info);
  const count = db.prepare("SELECT count(*) as count FROM processes").get();
  console.log("PROCESSES COUNT:", count);
} catch (e) {
  console.error("ERROR:", e);
}

import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
try {
  const alerts = db.prepare("SELECT * FROM production_alerts WHERE stato = 'pending' ORDER BY created_at DESC").all();
  console.log(alerts);
} catch (e) {
  console.error(e);
}

import Database from 'better-sqlite3';
const db = new Database('database.sqlite');
try {
  const processes = db.prepare(`
    SELECT p.*, a.nome as articolo_nome, a.codice as articolo_codice
    FROM processes p
    JOIN articles a ON p.articolo_id = a.id
  `).all();
  console.log("PROCESSES COUNT:", processes.length);
  console.log("FIRST PROCESS:", processes[0]);
} catch (e) {
  console.error("ERROR:", e);
}

import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const stmt = db.prepare("UPDATE articles SET nome = UPPER(nome) WHERE nome LIKE 'Pann. Laterale AGR%' OR nome LIKE 'Pann. Laterale %'");
  const info = stmt.run();
  console.log(`Aggiornati ${info.changes} articoli.`);
} catch (e) {
  console.error(e);
}

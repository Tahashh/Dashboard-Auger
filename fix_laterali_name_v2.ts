import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  // Update names to 'PANN. LATERALE AG...'
  // We match 'PANN. LATERALE ...' and replace 'PANN. LATERALE ' with 'PANN. LATERALE AG '
  const stmt = db.prepare(`
    UPDATE articles 
    SET nome = REPLACE(nome, 'PANN. LATERALE ', 'PANN. LATERALE AG ')
    WHERE nome LIKE 'PANN. LATERALE %' AND nome NOT LIKE 'PANN. LATERALE AG %'
  `);
  const info = stmt.run();
  console.log(`Aggiornati ${info.changes} articoli.`);
} catch (e) {
  console.error(e);
}

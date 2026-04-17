import Database from 'better-sqlite3';
const db = new Database('database.sqlite');

const tables = [
  'articles',
  'piastre_at',
  'porte_at',
  'involucro_at',
  'traverse_inventory',
  'agr_requirements'
];

console.log('Verifica salvataggio dati nel database:');
for (const table of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any;
    console.log(`Tabella ${table}: ${count.count} record trovati.`);
  } catch (e) {
    console.log(`Tabella ${table}: errore o non esistente.`);
  }
}

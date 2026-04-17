import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const agm = db.prepare("SELECT nome FROM articles WHERE nome LIKE '%STRUTTURA AGM%'").all();
  console.log('AGM structures found:', agm.length);
  if (agm.length > 0) {
    console.log('First 5:', agm.slice(0, 5));
  }
} catch (e) {
  console.error(e);
}

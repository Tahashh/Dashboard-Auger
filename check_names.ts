import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  const articles = db.prepare("SELECT id, nome FROM articles WHERE nome LIKE '%PANN. LATERALE%' LIMIT 5").all();
  console.log('Esempi di nomi:', articles);
} catch (e) {
  console.error(e);
}

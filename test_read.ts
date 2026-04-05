import Database from 'better-sqlite3';
try {
  const db = new Database('database.sqlite', { readonly: true });
  const articles = db.prepare('SELECT * FROM articles').all();
  console.log('Articles:', articles.length);
} catch (e) {
  console.error('Error:', e);
}

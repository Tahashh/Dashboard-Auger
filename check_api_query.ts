import Database from 'better-sqlite3';

try {
  const db = new Database('database.sqlite', { fileMustExist: true });
  
  const dbCount = db.prepare("SELECT COUNT(*) as count FROM articles").get() as any;
  console.log(`Total articles in DB: ${dbCount.count}`);
  
  const apiQueryCount = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT a.id
      FROM articles a 
      LEFT JOIN processes p ON a.id = p.articolo_id
      GROUP BY a.id
    )
  `).get() as any;
  console.log(`Articles returned by API query: ${apiQueryCount.count}`);

  const missingInApi = db.prepare(`
    SELECT id, codice, nome FROM articles 
    WHERE id NOT IN (
      SELECT a.id
      FROM articles a 
      LEFT JOIN processes p ON a.id = p.articolo_id
      GROUP BY a.id
    )
  `).all();
  console.log('Articles missing in API query:', missingInApi);

} catch (e) {
  console.error('Error:', e);
}

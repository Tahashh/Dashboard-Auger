import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  db.transaction(() => {
    // Get all AGM articles
    const agmArticles = db.prepare(`
      SELECT id, piega FROM articles 
      WHERE nome LIKE '%STRUTTURA AGM%' OR codice LIKE 'AGM%'
    `).all() as { id: number, piega: number }[];

    let updated = 0;
    for (const article of agmArticles) {
      if (article.piega !== 0) {
        // Move piega to saldatura in processes
        db.prepare(`
          UPDATE processes 
          SET saldatura = saldatura + ?, piega = 0
          WHERE articolo_id = ?
        `).run(article.piega, article.id);

        // Reset piega in articles
        db.prepare(`
          UPDATE articles 
          SET piega = 0 
          WHERE id = ?
        `).run(article.id);
        
        updated++;
      }
    }
    console.log(`Successfully migrated ${updated} AGM articles: moved piega to saldatura.`);
  })();
} catch (error) {
  console.error('Migration failed:', error);
}

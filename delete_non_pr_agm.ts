import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

try {
  db.transaction(() => {
    // Find articles to delete
    const articlesToDelete = db.prepare(`
      SELECT id, codice, nome FROM articles 
      WHERE (nome LIKE '%STRUTTURA AGM%' OR codice LIKE 'AGM%') 
      AND codice NOT LIKE '%PR'
    `).all() as { id: number, codice: string, nome: string }[];

    console.log(`Found ${articlesToDelete.length} articles to delete.`);

    for (const article of articlesToDelete) {
      console.log(`Deleting: ${article.codice} - ${article.nome}`);
      
      // Delete from processes
      db.prepare('DELETE FROM processes WHERE articolo_id = ?').run(article.id);
      
      // Delete from commitments
      db.prepare('DELETE FROM commitments WHERE articolo_id = ?').run(article.id);
      
      // Delete from articles
      db.prepare('DELETE FROM articles WHERE id = ?').run(article.id);
    }
    
    console.log('Deletion complete.');
  })();
} catch (error) {
  console.error('Migration failed:', error);
}

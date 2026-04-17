import Database from 'better-sqlite3';

try {
  const db = new Database('database.sqlite', { fileMustExist: true });
  
  const nullCodes = db.prepare("SELECT COUNT(*) as count FROM articles WHERE codice IS NULL OR codice = ''").get() as any;
  console.log(`Articles with NULL or empty codes: ${nullCodes.count}`);
  
  const duplicates = db.prepare('SELECT codice, COUNT(*) as count FROM articles GROUP BY codice HAVING count > 1').all();
  console.log('Duplicate codes:', duplicates);

  const codesToCheck = [
    'AGR0403T', 'AGR0404T', 'AGR0405T', 'AGR0305T', 'AGR0306T',
    'AGR0604T', 'AGR0605T', 'AGR0606T', 'AGR0804T', 'AGR0805T'
  ];
  
  console.log('Checking existence of reported article codes (with quotes):');
  const stmt = db.prepare("SELECT id, nome, '|' || codice || '|' as quoted_codice FROM articles WHERE codice = ?");
  
  codesToCheck.forEach(code => {
    const row = stmt.get(code);
    if (row) {
      console.log(`[EXISTS] ID: ${(row as any).id}, Nome: ${(row as any).nome}, Quoted Codice: ${(row as any).quoted_codice}`);
    } else {
      // Try fuzzy search
      const fuzzy = db.prepare("SELECT codice FROM articles WHERE codice LIKE ?").get(`%${code}%`) as any;
      console.log(`[MISSING] Codice: ${code} ${fuzzy ? `(Found similar: |${fuzzy.codice}|)` : ''}`);
    }
  });

} catch (e) {
  console.error('database.sqlite error:', e);
}

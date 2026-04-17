import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const agcCodes = [
  "AGC061204", "AGC061403", "AGC081204", "AGC081403", "AGC081404",
  "AGC101204", "AGC101404", "AGC121204", "AGC121403", "AGC121404",
  "AGC141204", "AGC141404"
];

try {
  const existing = db.prepare("SELECT codice FROM articles WHERE codice IN (" + agcCodes.map(() => '?').join(',') + ")").all(...agcCodes) as any[];
  const existingCodes = existing.map(a => a.codice);
  const missing = agcCodes.filter(c => !existingCodes.includes(c));
  
  console.log('Missing AGC articles:', missing);
} catch (e) {
  console.error(e);
}

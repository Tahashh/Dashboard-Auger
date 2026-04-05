import Database from 'better-sqlite3';

try {
  const db = new Database('db_copy.sqlite', { fileMustExist: true });
  db.pragma('integrity_check');
  console.log('db_copy.sqlite is OK');
} catch (e) {
  console.error('db_copy.sqlite error:', e);
}

try {
  const db2 = new Database('sqlite.db', { fileMustExist: true });
  db2.pragma('integrity_check');
  console.log('sqlite.db is OK');
} catch (e) {
  console.error('sqlite.db error:', e);
}

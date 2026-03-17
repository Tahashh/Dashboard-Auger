import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');

// Ensure the directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codice TEXT NOT NULL UNIQUE,
    verniciati INTEGER DEFAULT 0,
    impegni_clienti INTEGER DEFAULT 0,
    piega INTEGER DEFAULT 0,
    scorta INTEGER DEFAULT 10,
    prezzo REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo_id INTEGER NOT NULL,
    taglio INTEGER DEFAULT 0,
    piega INTEGER DEFAULT 0,
    verniciatura INTEGER DEFAULT 0,
    FOREIGN KEY (articolo_id) REFERENCES articles (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    email TEXT,
    telefono TEXT,
    data_inserimento DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo_id INTEGER NOT NULL,
    cliente TEXT NOT NULL,
    commessa TEXT NOT NULL,
    quantita INTEGER DEFAULT 0,
    data_inserimento DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(articolo_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS movements_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo_id INTEGER NOT NULL,
    fase TEXT NOT NULL,
    tipo TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    operatore TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(articolo_id) REFERENCES articles(id) ON DELETE CASCADE
  );
`);

try {
  db.exec('ALTER TABLE articles ADD COLUMN piega INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE articles ADD COLUMN scorta INTEGER DEFAULT 10;');
} catch (e) {}

try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo REAL DEFAULT 0;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE clients ADD COLUMN email TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE clients ADD COLUMN telefono TEXT;');
} catch (e) {
  // Column might already exist
}

try {
  db.exec('ALTER TABLE commitments ADD COLUMN fase_produzione TEXT DEFAULT \'Generico\';');
} catch (e) {}

try {
  db.exec('ALTER TABLE commitments ADD COLUMN operatore TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE commitments ADD COLUMN note TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE commitments ADD COLUMN timestamp_modifica DATETIME DEFAULT CURRENT_TIMESTAMP;');
} catch (e) {}

try {
  db.exec('ALTER TABLE commitments ADD COLUMN stato_lavorazione TEXT DEFAULT \'Pianificato\';');
} catch (e) {}

try {
  db.exec('ALTER TABLE movements_log ADD COLUMN operatore TEXT;');
} catch (e) {}

export default db;

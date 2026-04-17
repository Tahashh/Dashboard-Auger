import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

console.log('Dropping existing tables...');
db.exec(`DROP TRIGGER IF EXISTS trg_movimenti_c_gialla_after_insert`);

// We cannot drop and recreate easily without losing data, but if we don't care because we just created them:
db.exec(`DROP TABLE IF EXISTS movimenti_c_gialla`);
db.exec(`DROP TABLE IF EXISTS c_gialle`);

console.log('Creating tables...');
db.exec(`
  CREATE TABLE c_gialle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_reg DATETIME DEFAULT CURRENT_TIMESTAMP,
    articolo_spc TEXT NOT NULL,
    fase_richiesta TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    cliente TEXT,
    commessa TEXT,
    operatore TEXT,
    tempo_min INTEGER,
    stato TEXT DEFAULT 'Iniziato',
    data_aggiornamento DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(articolo_spc, commessa, cliente)
  );

  CREATE TABLE movimenti_c_gialla (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_reg DATETIME DEFAULT CURRENT_TIMESTAMP,
    articolo_spc TEXT NOT NULL,
    fase TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    cliente TEXT,
    commessa TEXT,
    operatore TEXT,
    tempo_min INTEGER
  );

  CREATE TRIGGER trg_movimenti_c_gialla_after_insert
  AFTER INSERT ON movimenti_c_gialla
  BEGIN
    INSERT INTO c_gialle (articolo_spc, fase_richiesta, quantita, cliente, commessa, operatore, tempo_min, stato, data_aggiornamento)
    SELECT NEW.articolo_spc, NEW.fase, NEW.quantita, NEW.cliente, NEW.commessa, NEW.operatore, NEW.tempo_min, 
           CASE 
             WHEN NEW.fase = 'Taglio' THEN 'Tagliato'
             WHEN NEW.fase = 'Piega' THEN 'Piegato'
             WHEN NEW.fase = 'Saldatura' THEN 'Saldato'
             WHEN NEW.fase = 'Verniciatura' THEN 'Verniciato'
             ELSE 'Iniziato'
           END, 
           CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM c_gialle WHERE articolo_spc = NEW.articolo_spc AND commessa = NEW.commessa AND cliente = NEW.cliente);

    UPDATE c_gialle
    SET 
      stato = CASE 
                WHEN NEW.fase = 'Taglio' THEN 'Tagliato'
                WHEN NEW.fase = 'Piega' THEN 'Piegato'
                WHEN NEW.fase = 'Saldatura' THEN 'Saldato'
                WHEN NEW.fase = 'Verniciatura' THEN 'Verniciato'
                ELSE stato
              END,
      data_aggiornamento = CURRENT_TIMESTAMP
    WHERE articolo_spc = NEW.articolo_spc AND commessa = NEW.commessa AND cliente = NEW.cliente;
  END;
`);

console.log('Done!');

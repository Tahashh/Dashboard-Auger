import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');

// Ensure the directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('Initializing database...');
const db = new Database(dbPath);
console.log('Database connection established.');

db.pragma('journal_mode = WAL');
console.log('WAL mode enabled.');

// Initialize tables
console.log('Initializing tables...');
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    codice TEXT NOT NULL UNIQUE,
    verniciati INTEGER DEFAULT 0,
    impegni_clienti INTEGER DEFAULT 0,
    piega INTEGER DEFAULT 0,
    scorta INTEGER DEFAULT 10,
    prezzo REAL DEFAULT 0,
    famiglia TEXT
  );

  CREATE TABLE IF NOT EXISTS processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo_id INTEGER NOT NULL UNIQUE,
    taglio INTEGER DEFAULT 0,
    piega INTEGER DEFAULT 0,
    saldatura INTEGER DEFAULT 0,
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
    cliente TEXT,
    commessa TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(articolo_id) REFERENCES articles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure all articles have a process record
try {
  db.exec(`
    INSERT INTO processes (articolo_id)
    SELECT id FROM articles
    WHERE id NOT IN (SELECT articolo_id FROM processes);
  `);
} catch (e) {
  // This might fail if processes table is not ready, but it's handled
}

// Clean up duplicate processes if any exist before adding unique constraint
try {
  db.exec(`
    DELETE FROM processes 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM processes 
      GROUP BY articolo_id
    );
  `);
} catch (e) {}

// Cleanup 'Altro' articles
try {
  const getCategory = (name: string, code?: string): string => {
    const upperName = name?.toUpperCase() || '';
    const upperCode = code?.toUpperCase() || '';
    
    if (upperName.includes('PORTA') || upperName.includes('PORTE') || upperName.includes('ANTA') || upperName.includes('P.TA') || /^\d+X\d+/.test(upperName) || upperCode.startsWith('AG-PO') || upperCode.startsWith('PO') || upperCode.startsWith('PS')) {
      if (upperCode.endsWith('IB') || upperCode.endsWith('CB') || upperName.includes('IB') || upperName.includes('CB')) return 'Porte IB/CB';
      if (upperCode.endsWith('PX') || upperCode.endsWith('PV') || upperName.includes('PX') || upperName.includes('PV')) return 'Porte PX/PV';
      if (upperCode.includes('INT') || upperCode.includes('180')) return 'Porte INT/LAT/180°';
      return 'Porte Standard';
    }
    if (upperName.includes('RETRO')) {
      if (upperCode.includes('MCR')) return 'Montanti Centrali Retro';
      return 'Retri';
    }
    if (upperName.includes('LATERALE')) {
      if (upperCode.includes('LB')) return 'Laterali Ibridi';
      return 'Laterali';
    }
    if (upperName.includes('TETTO')) return 'Tetti';
    if (upperName.includes('PIASTRA')) {
      if (upperName.includes('LATERALE')) return 'Piastre Laterali';
      return 'Piastre Frontali';
    }
    if (upperName.includes('BASI&TETTI') || (upperName.includes('BASI') && upperName.includes('TETTI'))) return 'Basi&Tetti';
    if (upperName.includes('STRUTTURE AGR') || upperName.includes('STRUTTURA AGR')) return 'Strutture Agr';
    if (upperName.includes('AGS')) return 'AGS';
    if (upperName.includes('AGC')) return 'AGC';
    if (upperName.includes('AGLM')) return 'AGLM';
    if (upperName.includes('AGLC')) return 'AGLC';
    if (upperName.includes('INVOLUCRO AT')) return 'INVOLUCRI AT';
    if (upperName.includes('CRISTALLO') || upperName.includes('VETRO')) return 'Cristalli';
    return 'Altro';
  };

  const articles = db.prepare('SELECT id, nome, codice FROM articles').all() as any[];
  const toDelete = articles.filter(a => getCategory(a.nome, a.codice) === 'Altro').map(a => a.id);
  
  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} articles from 'Altro' category...`);
    const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
    const deleteMany = db.transaction((ids) => {
      for (const id of ids) stmt.run(id);
    });
    deleteMany(toDelete);
    console.log('Cleanup complete.');
  }
} catch (e) {
  console.error('Error during Altro cleanup:', e);
}

try {
  db.exec('ALTER TABLE processes ADD COLUMN saldatura INTEGER DEFAULT 0;');
} catch (e) {}

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
  db.exec('ALTER TABLE articles ADD COLUMN famiglia TEXT;');
} catch (e) {}

try {
  db.exec("UPDATE movements_log SET tipo = 'evasione' WHERE (fase = 'spedizione' OR fase = 'impegni_evasione' OR fase = 'impegni_evasione_commessa') AND tipo = 'scarico';");
} catch (e) {}

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

// Migration: Fix commitments with 'Generico' phase
try {
  db.exec(`
    UPDATE commitments
    SET fase_produzione = CASE 
      WHEN (SELECT nome FROM articles WHERE id = commitments.articolo_id) LIKE '%PIASTRA%' THEN 'Piega'
      ELSE 'Verniciatura'
    END
    WHERE fase_produzione = 'Generico';
  `);
} catch (e) {
  // This might fail if the table or column doesn't exist yet
}

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
  db.exec('ALTER TABLE commitments ADD COLUMN priorita INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE movements_log ADD COLUMN operatore TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE movements_log ADD COLUMN cliente TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE movements_log ADD COLUMN commessa TEXT;');
} catch (e) {}

console.log('Applying cleanup and standardization migrations...');
try {
  db.exec(`
    -- 1. Standardize prefix for ARMADIO MONOBLOCCO
    UPDATE articles 
    SET nome = REPLACE(nome, 'ARMADIO MONOBLOCCO', 'ARMADIO MONOB.')
    WHERE nome LIKE 'ARMADIO MONOBLOCCO%';

    -- 2. General cleanup: remove everything after dimensions (WIDTHxHEIGHTxDEPTH)
    -- This logic finds the first space after the first 'X' to truncate the string.
    UPDATE articles 
    SET nome = SUBSTR(nome, 1, INSTR(SUBSTR(nome, INSTR(nome, 'X') + 1), ' ') + INSTR(nome, 'X') - 1)
    WHERE (nome LIKE 'ARMADIO MONOB. %X%X%' OR nome LIKE 'STRUTTURA AGM %X%X%')
      AND INSTR(SUBSTR(nome, INSTR(nome, 'X') + 1), ' ') > 0;

    -- 3. Specific cleanup for common suffixes that might remain or don't follow the X pattern
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' PORTA + PANN. RETRO', '')) WHERE nome LIKE 'ARMADIO MONOB.%' OR nome LIKE 'STRUTTURA AGM%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' PORTA PLEXI + PANN. RETRO', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' PORTA DOPPIA + PANN. RETRO', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' DOPPIA PORTA + PANN. RETRO', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' PERSONALIZZATO', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' RAL PERSONALIZZATO', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' REALIZZATO SU NS.BASE STANDARD', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' FORATURE COME DA DIS.AGM006', '')) WHERE nome LIKE 'ARMADIO MONOB.%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' SALDATO', '')) WHERE nome LIKE 'STRUTTURA AGM%';
    UPDATE articles SET nome = TRIM(REPLACE(nome, ' VERNICIATO', '')) WHERE nome LIKE 'STRUTTURA AGM%';
    
    -- Final trim just in case
    UPDATE articles SET nome = TRIM(nome) WHERE nome LIKE 'ARMADIO MONOB.%' OR nome LIKE 'STRUTTURA AGM%';

    -- Set family for AGM articles
    UPDATE articles SET famiglia = 'AGM' WHERE nome LIKE 'STRUTTURA AGM%';
  `);
  console.log('Standardization migrations applied successfully.');
} catch (e) {
  console.error('Error during standardization migrations:', e);
}

// Seeding articles
const seedArticles = [
  { nome: 'PORTA 200X1800', codice: 'AG-PO0218' },
  { nome: 'PORTA 300X1800', codice: 'AG-PO0318' },
  { nome: 'PORTA 300X2000', codice: 'AG-PO0320' },
  { nome: 'PORTA 400X1600', codice: 'AG-PO0416' },
  { nome: 'PORTA 400X1800', codice: 'AG-PO0418' },
  { nome: 'PORTA 400X2000', codice: 'AG-PO0420' },
  { nome: 'PORTA 400X2200', codice: 'AG-PO0422' },
  { nome: 'PORTA 600X1000', codice: 'AG-PO0610' },
  { nome: 'PORTA 600X1200', codice: 'AG-PO0612' },
  { nome: 'PORTA 600X1400', codice: 'AG-PO0614' },
  { nome: 'PORTA 600X1600', codice: 'AG-PO0616' },
  { nome: 'PORTA 600X1800', codice: 'AG-PO0618' },
  { nome: 'PORTA 600X2000', codice: 'AG-PO0620' },
  { nome: 'PORTA 600X2200', codice: 'AG-PO0622' },
  { nome: 'PORTA 800X1000', codice: 'AG-PO0810' },
  { nome: 'PORTA 800X1200', codice: 'AG-PO0812' },
  { nome: 'PORTA 800X1400', codice: 'AG-PO0814' },
  { nome: 'PORTA 800X1600', codice: 'AG-PO0816' },
  { nome: 'PORTA 800X1800', codice: 'AG-PO0818' },
  { nome: 'PORTA 800X2000', codice: 'AG-PO0820' },
  { nome: 'PORTA 800X2200', codice: 'AG-PO0822' },
  { nome: 'PORTA 1000X1000', codice: 'AG-PO1010' },
  { nome: 'PORTA 1000X1200', codice: 'AG-PO1012' },
  { nome: 'PORTA 1000X1400', codice: 'AG-PO1014' },
  { nome: 'PORTA 1000X1600', codice: 'AG-PO1016' },
  { nome: 'PORTA 1000X1800', codice: 'AG-PO1018' },
  { nome: 'PORTA 1000X2000', codice: 'AG-PO1020' },
  { nome: 'PORTA 1000X2200', codice: 'AG-PO1022' },
  { nome: 'PORTA PX 400X1400', codice: 'AG-PX0414' },
  { nome: 'PORTA PX 400X1600', codice: 'AG-PX0416' },
  { nome: 'PORTA PX 400X1800', codice: 'AG-PX0418' },
  { nome: 'PORTA PX 400X2000', codice: 'AG-PX0420' },
  { nome: 'PORTA PX 400X2200', codice: 'AG-PX0422' },
  { nome: 'PORTA PX 600X1000', codice: 'AG-PX0610' },
  { nome: 'PORTA PX 600X1200', codice: 'AG-PX0612' },
  { nome: 'PORTA PX 600X1600', codice: 'AG-PX0616' },
  { nome: 'PORTA PX 600X1800', codice: 'AG-PX0618' },
  { nome: 'PORTA PX 600X2000', codice: 'AG-PX0620' },
  { nome: 'PORTA PX 600X2200', codice: 'AG-PX0622' },
  { nome: 'PORTA PX 800X1200', codice: 'AG-PX0812' },
  { nome: 'PORTA PX 800X1400', codice: 'AG-PX0814' },
  { nome: 'PORTA PX 800X1600', codice: 'AG-PX0816' },
  { nome: 'PORTA PX 800X1800', codice: 'AG-PX0818' },
  { nome: 'PORTA PX 800X2000', codice: 'AG-PX0820' },
  { nome: 'PORTA PX 800X2200', codice: 'AG-PX0822' },
  { nome: 'PORTA PX 1000X140', codice: 'AG-PX1014' },
  { nome: 'PORTA PX 1000X160', codice: 'AG-PX1016' },
  { nome: 'PORTA PX 1000X180', codice: 'AG-PX1018' },
  { nome: 'PORTA PX 1000X200', codice: 'AG-PX1020' },
  { nome: 'PORTA PX 1000X220', codice: 'AG-PX1022' },
  { nome: 'PORTA PV 600X1200', codice: 'AG-PV0612' },
  { nome: 'PORTA PV 600X1600', codice: 'AG-PV0616' },
  { nome: 'PORTA PV 600X2000', codice: 'AG-PV0620' },
  { nome: 'PORTA PV 800X1200', codice: 'AG-PV0812' },
  { nome: 'PORTA PV 800X1800', codice: 'AG-PV0818' },
  { nome: 'PORTA PV 800X2000', codice: 'AG-PV0820' },
  { nome: 'PORTA CIECA AG L400 H1200 IN BATTUTA', codice: 'AG-PO0412IB' },
  { nome: 'PORTA CIECA AG L400 H1200 CON BATTUTA', codice: 'AG-PO0412CB' },
  { nome: 'PORTA CIECA AG L400 H1600 IN BATTUTA', codice: 'AG-PO0416IB' },
  { nome: 'PORTA CIECA AG L400 H1600 CON BATTUTA', codice: 'AG-PO0416CB' },
  { nome: 'PORTA CIECA AG L400 H1800 IN BATTUTA', codice: 'AG-PO0418IB' },
  { nome: 'PORTA CIECA AG L400 H1800 CON BATTUTA', codice: 'AG-PO0418CB' },
  { nome: 'PORTA CIECA AG L400 H2000 IN BATTUTA', codice: 'AG-PO0420IB' },
  { nome: 'PORTA CIECA AG L400 H2000 CON BATTUTA', codice: 'AG-PO0420CB' },
  { nome: 'PORTA CIECA AG L400 H2200 IN BATTUTA', codice: 'AG-PO0422IB' },
  { nome: 'PORTA CIECA AG L400 H2200 CON BATTUTA', codice: 'AG-PO0422CB' },
  { nome: 'PORTA CIECA AG L500 H1000 IN BATTUTA', codice: 'AG-PO0510IB' },
  { nome: 'PORTA CIECA AG L500 H1000 CON BATTUTA', codice: 'AG-PO0510CB' },
  { nome: 'PORTA CIECA AG L500 H1200 IN BATTUTA', codice: 'AG-PO0512IB' },
  { nome: 'PORTA CIECA AG L500 H1200 CON BATTUTA', codice: 'AG-PO0512CB' },
  { nome: 'PORTA CIECA AG L500 H1400 IN BATTUTA', codice: 'AG-PO0514IB' },
  { nome: 'PORTA CIECA AG L500 H1400 CON BATTUTA', codice: 'AG-PO0514CB' },
  { nome: 'PORTA CIECA AG L500 H1600 IN BATTUTA', codice: 'AG-PO0516IB' },
  { nome: 'PORTA CIECA AG L500 H1600 CON BATTUTA', codice: 'AG-PO0516CB' },
  { nome: 'PORTA CIECA AG L500 H1800 IN BATTUTA', codice: 'AG-PO0518IB' },
  { nome: 'PORTA CIECA AG L500 H1800 CON BATTUTA', codice: 'AG-PO0518CB' },
  { nome: 'PORTA CIECA AG L500 H2000 IN BATTUTA', codice: 'AG-PO0520IB' },
  { nome: 'PORTA CIECA AG L500 H2000 CON BATTUTA', codice: 'AG-PO0520CB' },
  { nome: 'PORTA CIECA AG L500 H2200 IN BATTUTA', codice: 'AG-PO0522IB' },
  { nome: 'PORTA CIECA AG L500 H2200 CON BATTUTA', codice: 'AG-PO0522CB' },
  { nome: 'PORTA CIECA AG L600 H800 IN BATTUTA', codice: 'AG-PO0608IB' },
  { nome: 'PORTA CIECA AG L600 H800 CON BATTUTA', codice: 'AG-PO0608CB' },
  { nome: 'PORTA CIECA AG L600 H1000 IN BATTUTA', codice: 'AG-PO0610IB' },
  { nome: 'PORTA CIECA AG L600 H1000 CON BATTUTA', codice: 'AG-PO0610CB' },
  { nome: 'PORTA CIECA AG L600 H1200 IN BATTUTA', codice: 'AG-PO0612IB' },
  { nome: 'PORTA CIECA AG L600 H1200 CON BATTUTA', codice: 'AG-PO0612CB' },
  { nome: 'PORTA CIECA AG L600 H1400 IN BATTUTA', codice: 'AG-PO0614IB' },
  { nome: 'PORTA CIECA AG L600 H1400 CON BATTUTA', codice: 'AG-PO0614CB' },
  { nome: 'PORTA CIECA AG L600 H1600 IN BATTUTA', codice: 'AG-PO0616IB' },
  { nome: 'PORTA CIECA AG L600 H1600 CON BATTUTA', codice: 'AG-PO0616CB' },
  { nome: 'PORTA CIECA AG L600 H1800 IN BATTUTA', codice: 'AG-PO0618IB' },
  { nome: 'PORTA CIECA AG L600 H1800 CON BATTUTA', codice: 'AG-PO0618CB' },
  { nome: 'PORTA CIECA AG L600 H2000 IN BATTUTA', codice: 'AG-PO0620IB' },
  { nome: 'PORTA CIECA AG L600 H2000 CON BATTUTA', codice: 'AG-PO0620CB' },
  { nome: 'PORTA CIECA AG L600 H2200 IN BATTUTA', codice: 'AG-PO0622IB' },
  { nome: 'PORTA CIECA AG L600 H2200 CON BATTUTA', codice: 'AG-PO0622CB' },
  { nome: 'PORTA CIECA AG L700 H800 IN BATTUTA', codice: 'AG-PO0708IB' },
  { nome: 'PORTA CIECA AG L700 H800 CON BATTUTA', codice: 'AG-PO0708CB' },
  { nome: 'PORTA CIECA AG L700 H1000 IN BATTUTA', codice: 'AG-PO0710IB' },
  { nome: 'PORTA CIECA AG L700 H1000 CON BATTUTA', codice: 'AG-PO0710CB' },
  { nome: 'PORTA CIECA AG L700 H1200 IN BATTUTA', codice: 'AG-PO0712IB' },
  { nome: 'PORTA CIECA AG L700 H1200 CON BATTUTA', codice: 'AG-PO0712CB' },
  { nome: 'PORTA CIECA AG L700 H1400 IN BATTUTA', codice: 'AG-PO0714IB' },
  { nome: 'PORTA CIECA AG L700 H1400 CON BATTUTA', codice: 'AG-PO0714CB' },
  { nome: 'PORTA CIECA AG L700 H1800 IN BATTUTA', codice: 'AG-PO0718IB' },
  { nome: 'PORTA CIECA AG L700 H1800 CON BATTUTA', codice: 'AG-PO0718CB' },
  { nome: 'PORTA CIECA AG L700 H2000 IN BATTUTA', codice: 'AG-PO0720IB' },
  { nome: 'PORTA CIECA AG L700 H2000 CON BATTUTA', codice: 'AG-PO0720CB' },
  { nome: 'PORTA CIECA AG L700 H2200 IN BATTUTA', codice: 'AG-PO0722IB' },
  { nome: 'PORTA CIECA AG L700 H2200 CON BATTUTA', codice: 'AG-PO0722CB' },
  { nome: 'PORTA CIECA AG L800 H800 IN BATTUTA', codice: 'AG-PO0808IB' },
  { nome: 'PORTA CIECA AG L800 H800 CON BATTUTA', codice: 'AG-PO0808CB' },
  { nome: 'PORTA CIECA AG L800 H1000 IN BATTUTA', codice: 'AG-PO0810IB' },
  { nome: 'PORTA CIECA AG L800 H1000 CON BATTUTA', codice: 'AG-PO0810CB' },
  { nome: 'PORTA CIECA AG L800 H1200 IN BATTUTA', codice: 'AG-PO0812IB' },
  { nome: 'PORTA CIECA AG L800 H1200 CON BATTUTA', codice: 'AG-PO0812CB' },
  { nome: 'PORTA CIECA AG L800 H1400 IN BATTUTA', codice: 'AG-PO0814IB' },
  { nome: 'PORTA CIECA AG L800 H1400 CON BATTUTA', codice: 'AG-PO0814CB' },
  { nome: 'PORTA CIECA AG L800 H1800 IN BATTUTA', codice: 'AG-PO0818IB' },
  { nome: 'PORTA CIECA AG L800 H1800 CON BATTUTA', codice: 'AG-PO0818CB' },
  { nome: 'PORTA CIECA AG L800 H2000 IN BATTUTA', codice: 'AG-PO0820IB' },
  { nome: 'PORTA CIECA AG L800 H2000 CON BATTUTA', codice: 'AG-PO0820CB' },
  { nome: 'PORTA CIECA AG L800 H2200 IN BATTUTA', codice: 'AG-PO0822IB' },
  { nome: 'PORTA CIECA AG L800 H2200 CON BATTUTA', codice: 'AG-PO0822CB' },
  { nome: 'PORTA CIECA AG L1000 H800 IN BATTUTA', codice: 'AG-PO1008IB' },
  { nome: 'PORTA CIECA AG L1000 H800 CON BATTUTA', codice: 'AG-PO1008CB' },
  { nome: 'PORTA CIECA AG L1000 H1000 IN BATTUTA', codice: 'AG-PO1010IB' },
  { nome: 'PORTA CIECA AG L1000 H1000 CON BATTUTA', codice: 'AG-PO1010CB' },
  { nome: 'INVOLUCRO AT 1000X1000X300', codice: 'AT-IN101030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1000X400', codice: 'AT-IN101040', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1200X300', codice: 'AT-IN101230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1400X300', codice: 'AT-IN101430', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X800X200', codice: 'AT-IN10820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X800X300', codice: 'AT-IN10830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X1000X300', codice: 'AT-IN121030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X1200X300', codice: 'AT-IN121230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X800X300', codice: 'AT-IN12830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X200', codice: 'AT-IN4520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X250', codice: 'AT-IN4525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X200', codice: 'AT-IN4620', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X250', codice: 'AT-IN4625', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X200', codice: 'AT-IN5520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X250', codice: 'AT-IN5525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X200', codice: 'AT-IN5720', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X250', codice: 'AT-IN5725', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X250', codice: 'AT-IN61025', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X300', codice: 'AT-IN61030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X400', codice: 'AT-IN61040', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1200X300', codice: 'AT-IN61230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X400X200', codice: 'AT-IN6420', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X200', codice: 'AT-IN6620', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X250', codice: 'AT-IN6625', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X300', codice: 'AT-IN6630', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X400', codice: 'AT-IN6640', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X200', codice: 'AT-IN6820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X250', codice: 'AT-IN6825', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X400', codice: 'AT-IN6840', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X250', codice: 'AT-IN81025', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X300', codice: 'AT-IN81030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X600X300', codice: 'AT-IN8630', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X200', codice: 'AT-IN8820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X300', codice: 'AT-IN8830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT1000X1000X200 - PRS', codice: 'AT-IN101020-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT1000X1000X300 - PRS', codice: 'AT-IN101030-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT1000X1000X400 - PRS', codice: 'AT-IN101040-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1200X300 - PRS', codice: 'AT-IN101230-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1400X300 - PRS', codice: 'AT-IN101430-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X800X200 - PRS', codice: 'AT-IN10820-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X800X300 - PRS', codice: 'AT-IN10830-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X1000X300 - PRS', codice: 'AT-IN121030-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X1200X300 - PRS', codice: 'AT-IN121230-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X800X300 - PRS', codice: 'AT-IN12830-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 200X300X150', codice: 'AT-IN2315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 200X300X150 - PRS', codice: 'AT-IN2315-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 250X300X150', codice: 'AT-IN25315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 250X300X150 - PRS', codice: 'AT-IN25315-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X300X150', codice: 'AT-IN3315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X300X150 - PRS', codice: 'AT-IN3315-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X150', codice: 'AT-IN3415', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X150 - PRS', codice: 'AT-IN3415-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X200', codice: 'AT-IN3420', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X200 - PRS', codice: 'AT-IN3420-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X150', codice: 'AT-IN3515', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X150 - PRS', codice: 'AT-IN3515-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X200', codice: 'AT-IN3520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X250', codice: 'AT-IN3525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X250 - PRS', codice: 'AT-IN3525-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X300X150', codice: 'AT-IN4315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X300X150 - PERSONALIZZATO', codice: 'AT-IN4315-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X300X200', codice: 'AT-IN4320', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X300X200 - PERSONALIZZATO', codice: 'AT-IN4320-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT L400 H400 P200', codice: 'AT-IN4420_000001', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X400X200', codice: 'AT-IN4420', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X400X200 - PERSONALIZZATO', codice: 'AT-IN4420-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X150', codice: 'AT-IN4515', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X150 - PERSONALIZZATO', codice: 'AT-IN4515-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X200 - PERSONALIZZATO', codice: 'AT-IN4520-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X250 - PERSONALIZZATO', codice: 'AT-IN4525-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X200 - PERSONALIZZATO', codice: 'AT-IN4620-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X250 - PERSONALIZZATO', codice: 'AT-IN4625-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X200 - PERSONALIZZATO', codice: 'AT-IN5520-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X250 - PERSONALIZZATO', codice: 'AT-IN5525-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X200 - PERSONALIZZATO', codice: 'AT-IN5720-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X250 - PERSONALIZZATO', codice: 'AT-IN5725-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X250 - PERSONALIZZATO', codice: 'AT-IN61025-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X300 - PERSONALIZZATO', codice: 'AT-IN61030-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X400 - PERSONALIZZATO', codice: 'AT-IN61040-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1200X300 - PERSONALIZZATO', codice: 'AT-IN61230-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X400X200 - PERSONALIZZATO', codice: 'AT-IN6420-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X400X400', codice: 'AT-IN6440', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X400X400 - PERSONALIZZATO', codice: 'AT-IN6440-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X200 - PERSONALIZZATO', codice: 'AT-IN6620-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X250 - PERSONALIZZATO', codice: 'AT-IN6625-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X300 - PERSONALIZZATO', codice: 'AT-IN6630-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X400 - PERSONALIZZATO', codice: 'AT-IN6640-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X200 - PERSONALIZZATO', codice: 'AT-IN6820-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X250 - PERSONALIZZATO', codice: 'AT-IN6825-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X300', codice: 'AT-IN6830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X300 - PERSONALIZZATO', codice: 'AT-IN6830-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X400 - PERSONALIZZATO', codice: 'AT-IN6840-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT L800 H1000 P300', codice: 'AT-IN81020', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X250 - PERSONALIZZATO', codice: 'AT-IN81025-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X300 - PERSONALIZZATO', codice: 'AT-IN81030-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1200X300', codice: 'AT-IN81230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1200X300 - PERSONALIZZATO', codice: 'AT-IN81230-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X600X300 - PERSONALIZZATO', codice: 'AT-IN8630-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X200 - PERSONALIZZATO', codice: 'AT-IN8820-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X300 - PERSONALIZZATO', codice: 'AT-IN8830-PRS', famiglia: 'INVOLUCRI AT' },
  { nome: 'PANNELLO RETRO AG L250 H1800', codice: 'AG-RE02518', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L300 H1800', codice: 'AG-RE0318', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L300 H2000', codice: 'AG-RE0320', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L400 H1400', codice: 'AG-RE0414', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L400 H1600', codice: 'AG-RE0416', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L400 H1800', codice: 'AG-RE0418', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L400 H2000', codice: 'AG-RE0420', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L400 H2200', codice: 'AG-RE0422', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H1000', codice: 'AG-RE0610', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H1200', codice: 'AG-RE0612', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H1400', codice: 'AG-RE0614', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H1600', codice: 'AG-RE0616', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H1800', codice: 'AG-RE0618', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H2000', codice: 'AG-RE0620', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L600 H2200', codice: 'AG-RE0622', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1000', codice: 'AG-RE0810', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1200', codice: 'AG-RE0812', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1400', codice: 'AG-RE0814', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1600', codice: 'AG-RE0816', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1800', codice: 'AG-RE0818', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H2000', codice: 'AG-RE0820', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H2200', codice: 'AG-RE0822', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H1800 SC', codice: 'AG-RE0818-SC', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H2000 SC', codice: 'AG-RE0820-SC', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L800 H2200 SC', codice: 'AG-RE0822-SC', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H1000', codice: 'AG-RE1010', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H1200', codice: 'AG-RE1012', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H1400', codice: 'AG-RE1014', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H1600', codice: 'AG-RE1016', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H1800', codice: 'AG-RE1018', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H2000', codice: 'AG-RE1020', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1000 H2200', codice: 'AG-RE1022', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H800', codice: 'AG-RE128', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H1000', codice: 'AG-RE1210', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H1200', codice: 'AG-RE1212', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H1400', codice: 'AG-RE1214', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H1600', codice: 'AG-RE1216', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H1800', codice: 'AG-RE1218', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H2000', codice: 'AG-RE1220', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1200 H2200', codice: 'AG-RE1222', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H800', codice: 'AG-RE148', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H1000', codice: 'AG-RE1410', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H1200', codice: 'AG-RE1412', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H1800', codice: 'AG-RE1418', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H2000', codice: 'AG-RE1420', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1400 H2200', codice: 'AG-RE1422', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1600 H800', codice: 'AG-RE168', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1600 H1000', codice: 'AG-RE1610', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1600 H1200', codice: 'AG-RE1612', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1600 H1400', codice: 'AG-RE1614', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L1800 H800', codice: 'AG-RE188', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L2000 H800', codice: 'AG-RE208', famiglia: 'PANNELLI RETRO' },
  { nome: 'PANNELLO RETRO AG L2000 H1000', codice: 'AG-RE2010', famiglia: 'PANNELLI RETRO' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 300X2000', codice: 'AG-PA0320F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1400', codice: 'AG-PA0414F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1600', codice: 'AG-PA0416F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1800', codice: 'AG-PA0418F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X2000', codice: 'AG-PA0420F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X2200', codice: 'AG-PA0422F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1000', codice: 'AG-PA0610F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1200', codice: 'AG-PA0612F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1400', codice: 'AG-PA0614F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1600', codice: 'AG-PA0616F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X2200', codice: 'AG-PA0622F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1000', codice: 'AG-PA0810F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1200', codice: 'AG-PA0812F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1400', codice: 'AG-PA0814F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1600', codice: 'AG-PA0816F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X2200', codice: 'AG-PA0822F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1000X1000', codice: 'AG-PA1010F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1000X1200', codice: 'AG-PA1012F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1000X1400', codice: 'AG-PA1014F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1000X1600', codice: 'AG-PA1016F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1000X2200', codice: 'AG-PA1022F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X800', codice: 'AG-PA1208F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X1000', codice: 'AG-PA1210F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X1200', codice: 'AG-PA1212F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X1400', codice: 'AG-PA1214F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X1600', codice: 'AG-PA1216F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1200X2200', codice: 'AG-PA1222F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X800', codice: 'AG-PA1408F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X1000', codice: 'AG-PA1410F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X1200', codice: 'AG-PA1412F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X1800', codice: 'AG-PA1418F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X2000', codice: 'AG-PA1420F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1400X2200', codice: 'AG-PA1422F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X800', codice: 'AG-PA1608F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X1000', codice: 'AG-PA1610F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X1200', codice: 'AG-PA1612F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X1400', codice: 'AG-PA1614F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X1800', codice: 'AG-PA1618F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X2000', codice: 'AG-PA1620F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1600X2200', codice: 'AG-PA1622F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1800X1000', codice: 'AG-PA1810F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 1800X1200', codice: 'AG-PA1812F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 2000X800', codice: 'AG-PA2008F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 2000X1000', codice: 'AG-PA2010F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 2000X1200', codice: 'AG-PA2012F', famiglia: 'PIASTRE' },
];

const insertArticle = db.prepare('INSERT OR IGNORE INTO articles (nome, codice, famiglia) VALUES (?, ?, ?)');
const insertProcess = db.prepare('INSERT OR IGNORE INTO processes (articolo_id) VALUES (?)');

const seedClients = [
  'DIEMME Group Srl', 'S.E.I.C. Srl', 'ELWATT Srl', 'DD Dognini Srl', 'Famiglia Artigiana Srl',
  'Elettrocomandi Srl', 'A.R. Quadri Srl', 'Group System Srl', 'DAB Sistemi Integrati Srl', 'ZL Srl',
  'Elettrotecnica Lombarda Srl', 'Quadri Automation Srl', 'Elettroimpianti Industriali Srl', 'Tecnoquadri Srl', 'Elettrica System Srl',
  'Automazioni Industriali Lombarde Srl', 'Quadri Elettrici Milano Srl', 'Elettroservice Brianza Srl', 'Cablaggi Industriali Srl', 'Elettronica Applicata Srl',
  'Elettroteam Srl', 'Industrial Cabling Solutions Srl', 'Quadri e Automazione Srl', 'Elettrosistemi Srl', 'Tecnologie Elettriche Srl',
  'Elettroquadri Bergamo Srl', 'Impianti Elettrici Integrati Srl', 'Cabling System Srl', 'Elettroprogetti Srl', 'Automazione e Quadri Srl',
  'Elettro Solutions Srl', 'Power System Srl', 'Elettrica Industriale Srl', 'Cablaggi Tecnici Srl', 'Elettroimpianti Nord Srl',
  'Quadri e Sistemi Srl', 'Automation Service Srl', 'Elettroline Srl', 'Elettrotecnica Avanzata Srl', 'Industrial Electric Srl',
  'Elettroquadri Italia Srl', 'Cablaggi Lombardia Srl', 'Elettroengineering Srl', 'Quadri Tecnologici Srl', 'Elettrica Moderna Srl',
  'Elettroimpianti Tecnici Srl', 'System Cabling Srl', 'Elettroproject Srl', 'Automazioni Elettriche Srl', 'Elettroquadri Service Srl',
  'Elettronica Industriale Srl', 'Elettrosolutions Italia Srl', 'Cablaggi Avanzati Srl', 'Elettroquadri Engineering Srl', 'Elettrica Progetti Srl',
  'Quadri Industriali Srl', 'Elettroimpianti Service Srl', 'Automation Electric Srl', 'Elettroquadri Systems Srl', 'Cablaggi e Automazione Srl',
  'Elettrotecnica Service Srl', 'Industrial Systems Srl', 'Elettroquadri Lombardia Srl', 'Elettrica Sistemi Srl', 'Elettroimpianti Engineering Srl',
  'Cablaggi Tecnologici Srl', 'Elettroquadri Progetti Srl', 'Automation Systems Srl', 'Elettroimpianti Italia Srl', 'Quadri Elettrici Service Srl',
  'Elettrotecnica Italia Srl', 'Cablaggi Industriali Italia Srl', 'Elettroquadri Tecnici Srl', 'Elettrica Engineering Srl', 'Elettroimpianti Progetti Srl',
  'Automation Progetti Srl', 'Elettroquadri Industriali Srl', 'Cablaggi Service Srl', 'Elettrotecnica Systems Srl', 'Industrial Automation Srl',
  'Elettroimpianti Sistemi Srl', 'Quadri e Cablaggi Srl', 'Elettroquadri Avanzati Srl', 'Elettrica Service Srl', 'Elettroimpianti Avanzati Srl',
  'Automation Tecnica Srl', 'Elettroquadri Moderni Srl', 'Cablaggi Engineering Srl', 'Elettrotecnica Progetti Srl', 'Industrial Electric Systems Srl',
  'Elettroimpianti Tecnologici Srl', 'Quadri Elettrici Engineering Srl', 'Elettroquadri Italia Engineering Srl', 'Cablaggi Progetti Srl', 'Elettrotecnica Avanzata Italia Srl',
  'Industrial Cabling Italia Srl', 'Elettroimpianti Industriali Italia Srl', 'Quadri e Automazione Italia Srl', 'Elettroquadri Sistemi Integrati Srl', 'Automation Engineering Italia Srl'
];

const insertClient = db.prepare('INSERT OR IGNORE INTO clients (nome) VALUES (?)');

console.log('Starting seed and update transaction...');
try {
  db.transaction(() => {
    // Rimuovi articoli con codice che finisce per -40 come richiesto
    db.prepare("DELETE FROM articles WHERE codice LIKE '%-40'").run();

    // Rimuovi vecchie piastre non più necessarie
    const oldPiastre = [
      'PIASTRA 800X1800', 'PIASTRA 800X2000', 'PIASTRA 600X2000', 'PIASTRA 600X1800',
      'PIASTRA 1200X2000', 'PIASTRA 1200X1800', 'PIASTRA 1000X2000', 'PIASTRA 1000X1800'
    ];
    const deleteOldPiastra = db.prepare('DELETE FROM articles WHERE nome = ?');
    for (const nome of oldPiastre) {
      deleteOldPiastra.run(nome);
    }

    for (const art of seedArticles) {
      insertArticle.run(art.nome, art.codice, (art as any).famiglia || null);
    }
    
    // Assicura che ogni articolo abbia una riga in processes
    db.prepare(`
      INSERT OR IGNORE INTO processes (articolo_id, taglio, piega, saldatura, verniciatura)
      SELECT id, 0, 0, 0, 0 FROM articles
    `).run();
    
    for (const clientName of seedClients) {
      insertClient.run(clientName);
    }

    // Update specific articles with provided data
    const updates = [
      { name: '400x1200 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '400x1200 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '400x1600 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '400x1600 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '400x1800 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '400x1800 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '400x2000 ib', tag: 0, gre: 8, ver: 3, imp: 0, sco: 0 },
      { name: '400x2000 cb', tag: 0, gre: 8, ver: 3, imp: 0, sco: 0 },
      { name: '400x2200 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '400x2200 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '500x1000 ib', tag: 0, gre: 0, ver: 2, imp: 0, sco: 0 },
      { name: '500x1000 cb', tag: 0, gre: 0, ver: 3, imp: 0, sco: 0 },
      { name: '500x1200 ib', tag: 0, gre: 3, ver: 1, imp: 0, sco: 0 },
      { name: '500x1200 cb', tag: 0, gre: 3, ver: 1, imp: 0, sco: 0 },
      { name: '500x1400 ib', tag: 0, gre: 2, ver: 2, imp: 2, sco: 5 },
      { name: '500x1400 cb', tag: 0, gre: 2, ver: 2, imp: 2, sco: 5 },
      { name: '500x1600 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '500x1600 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '500x1800 ib', tag: 0, gre: 6, ver: 4, imp: 0, sco: 3 },
      { name: '500x1800 cb', tag: 0, gre: 6, ver: 2, imp: 0, sco: 3 },
      { name: '500x2000 ib', tag: 0, gre: 8, ver: 4, imp: 1, sco: 5 },
      { name: '500x2000 cb', tag: 0, gre: 8, ver: 4, imp: 1, sco: 5 },
      { name: '500x2200 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '500x2200 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '600x800 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '600x800 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '600x1000 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '600x1000 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '600x1200 ib', tag: 0, gre: 8, ver: 0, imp: 0, sco: 0 },
      { name: '600x1200 cb', tag: 0, gre: 8, ver: 0, imp: 0, sco: 0 },
      { name: '600x1400 ib', tag: 0, gre: 6, ver: 3, imp: 0, sco: 4 },
      { name: '600x1400 cb', tag: 0, gre: 6, ver: 3, imp: 0, sco: 4 },
      { name: '600x1600 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 2 },
      { name: '600x1600 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 2 },
      { name: '600x1800 ib', tag: 0, gre: 22, ver: 22, imp: 12, sco: 10 },
      { name: '600x1800 cb', tag: 0, gre: 21, ver: 22, imp: 12, sco: 10 },
      { name: '600x2000 ib', tag: 50, gre: 1, ver: 26, imp: 32, sco: 13 },
      { name: '600x2000 cb', tag: 81, gre: 5, ver: 26, imp: 33, sco: 13 },
      { name: '600x2200 ib', tag: 0, gre: 2, ver: 1, imp: 3, sco: 0 },
      { name: '600x2200 cb', tag: 0, gre: 1, ver: 1, imp: 3, sco: 0 },
      { name: '700x800 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '700x800 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '700x1000 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '700x1000 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '700x1200 ib', tag: 0, gre: 2, ver: 4, imp: 4, sco: 0 },
      { name: '700x1200 cb', tag: 0, gre: 2, ver: 4, imp: 4, sco: 0 },
      { name: '700x1400 ib', tag: 0, gre: 0, ver: 3, imp: 0, sco: 0 },
      { name: '700x1400 cb', tag: 0, gre: 0, ver: 3, imp: 0, sco: 0 },
      { name: '700x1800 ib', tag: 0, gre: 2, ver: 2, imp: 2, sco: 0 },
      { name: '700x1800 cb', tag: 0, gre: 2, ver: 2, imp: 2, sco: 0 },
      { name: '700x2000 ib', tag: 0, gre: 5, ver: 3, imp: 0, sco: 5 },
      { name: '700x2000 cb', tag: 0, gre: 5, ver: 3, imp: 0, sco: 5 },
      { name: '700x2200 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '700x2200 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '800x800 ib', tag: 0, gre: 0, ver: 1, imp: 1, sco: 0 },
      { name: '800x800 cb', tag: 0, gre: 0, ver: 1, imp: 1, sco: 0 },
      { name: '800x1000 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '800x1000 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '800x1200 ib', tag: 0, gre: 0, ver: 1, imp: 1, sco: 0 },
      { name: '800x1200 cb', tag: 0, gre: 0, ver: 1, imp: 1, sco: 0 },
      { name: '800x1400 ib', tag: 0, gre: 0, ver: 3, imp: 0, sco: 0 },
      { name: '800x1400 cb', tag: 0, gre: 0, ver: 3, imp: 0, sco: 0 },
      { name: '800x1800 ib', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '800x1800 cb', tag: 0, gre: 0, ver: 1, imp: 0, sco: 0 },
      { name: '800x2000 ib', tag: 15, gre: 22, ver: 21, imp: 9, sco: 10 },
      { name: '800x2000 cb', tag: 7, gre: 21, ver: 21, imp: 9, sco: 10 },
      { name: '800x2200 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '800x2200 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '1000x800 ib', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '1000x800 cb', tag: 0, gre: 0, ver: 0, imp: 0, sco: 0 },
      { name: '1000x1000 ib', tag: 0, gre: 0, ver: 4, imp: 4, sco: 0 },
      { name: '1000x1000 cb', tag: 0, gre: 0, ver: 4, imp: 4, sco: 0 },
    ];

    const allArticles = db.prepare('SELECT id, nome, codice FROM articles').all() as any[];
    let updatedCount = 0;

    for (const u of updates) {
      const searchName = u.name.toLowerCase();
      const match = allArticles.find(a => {
        const n = a.nome.toLowerCase();
        const c = a.codice.toLowerCase();
        
        // Match LxH IB/CB format
        if (searchName.includes('ib') || searchName.includes('cb')) {
          const type = searchName.includes('ib') ? 'ib' : 'cb';
          const dimsPart = searchName.split(' ')[0]; // e.g. 400x1200
          const [w, h] = dimsPart.split('x');
          
          // Check if article name contains dimensions (either 400x1200 or L400 and H1200)
          const hasDims = n.includes(dimsPart) || (n.includes(`l${w}`) && n.includes(`h${h}`));
          const hasType = n.includes(type === 'ib' ? 'in battuta' : 'con battuta') || c.endsWith(type.toUpperCase());
          
          return hasDims && hasType;
        }
        
        return n === searchName || n === 'porta ' + searchName || n.includes(searchName);
      });

      if (match) {
        db.prepare('UPDATE processes SET taglio = ?, piega = ?, verniciatura = ? WHERE articolo_id = ?').run(u.tag, u.gre, u.ver, match.id);
        db.prepare('UPDATE articles SET verniciati = ?, piega = ?, impegni_clienti = ?, scorta = ? WHERE id = ?').run(u.ver, u.gre, u.imp, u.sco, match.id);
        updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} articles with production data.`);

    // Add specific commitments requested by user
    const userCommitments = [
      { article: 'PORTA 300X1800', month: 'APRILE', qty: 2, client: 'PREI', commessa: 'C?' },
      { article: 'PORTA 300X2000', month: 'MARZO', qty: 3, client: 'ESEA', commessa: 'C.709' },
      { article: 'PORTA 300X2000', month: 'MARZO', qty: 3, client: 'PREI', commessa: 'C.737' },
      { article: 'PORTA 400X1800', month: 'APRILE', qty: 2, client: 'BRIZIO', commessa: 'C.751' },
      { article: 'PORTA 400X2000', month: 'MARZO', qty: 2, client: 'MAMBRETTI', commessa: 'C.500' },
      { article: 'PORTA 400X2000', month: 'MARZO', qty: 1, client: 'VARINELLI', commessa: 'C.510' },
      { article: 'PORTA 600X1200', month: 'MARZO', qty: 15, client: 'R&M', commessa: 'C.548' },
      { article: 'PORTA 600X1200', month: 'MARZO', qty: 1, client: 'GER', commessa: 'C.702' },
      { article: 'PORTA 600X1400', month: 'MARZO', qty: 2, client: 'BOUG.', commessa: 'C.730' },
      { article: 'PORTA 600X1400', month: 'APRILE', qty: 2, client: 'ELIT', commessa: 'C*' },
      { article: 'PORTA 600X1600', month: 'APRILE', qty: 1, client: 'FRIDEA', commessa: 'C*' },
      { article: 'PORTA 600X1800', month: 'MARZO', qty: 1, client: 'ANY MA', commessa: 'C.638' },
      { article: 'PORTA 600X1800', month: 'MARZO', qty: 1, client: 'TECHNOT.', commessa: 'C.700' },
      { article: 'PORTA 600X1800', month: 'MARZO', qty: 1, client: 'WATER', commessa: 'C.726' },
      { article: 'PORTA 600X1800', month: 'MARZO', qty: 2, client: 'IND.AMS', commessa: 'C.738' },
      { article: 'PORTA 600X1800', month: 'MARZO', qty: 1, client: 'IND. AMS', commessa: 'C.739' },
      { article: 'PORTA 600X1800', month: 'APRILE', qty: 2, client: 'TWK', commessa: 'C.735' },
      { article: 'PORTA 600X1800', month: 'APRILE', qty: 1, client: 'EL.SYST.', commessa: 'C.782' },
      { article: 'PORTA 600X1800', month: 'APRILE', qty: 2, client: 'WATER', commessa: 'C.785' },
      { article: 'PORTA 600X2000', month: 'MARZO', qty: 21, client: 'R&M', commessa: 'C.547' },
      { article: 'PORTA 600X2000', month: 'MARZO', qty: 1, client: 'MEP', commessa: 'C.722' },
      { article: 'PORTA 600X2000', month: 'MARZO', qty: 1, client: 'GAMBA', commessa: 'C.724' },
      { article: 'PORTA 600X2000', month: 'APRILE', qty: 2, client: 'EMMEBI', commessa: 'C.787' },
      { article: 'PORTA 600X2000', month: 'APRILE', qty: 1, client: 'R&M', commessa: 'C.797' },
      { article: 'PORTA 800X1200', month: 'MARZO', qty: 1, client: 'DUE PI', commessa: 'C.715' },
      { article: 'PORTA 800X1400', month: 'APRILE', qty: 1, client: 'DOMO', commessa: 'C.758' },
      { article: 'PORTA 800X1600', month: 'APRILE', qty: 1, client: 'STAR POW.', commessa: 'C.763' },
      { article: 'PORTA 800X1800', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.695' },
      { article: 'PORTA 800X1800', month: 'MARZO', qty: 2, client: 'CARAGLIO', commessa: 'C.*' },
      { article: 'PORTA 800X1800', month: 'APRILE', qty: 4, client: 'TIESSE', commessa: 'C.766' },
      { article: 'PORTA 800X1800', month: 'APRILE', qty: 2, client: 'WATER', commessa: 'C.785' },
      { article: 'PORTA 800X1800', month: 'APRILE', qty: 2, client: 'SYNTECH', commessa: 'C.788' },
      { article: 'PORTA 800X1800', month: 'APRILE', qty: 1, client: 'TECNOPRES', commessa: 'C*AGM' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 4, client: 'AUT.IND.', commessa: 'C.655' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 1, client: 'TOSA', commessa: 'C.602' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 1, client: 'MARIO', commessa: 'C.650' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 1, client: 'TECNOQ-', commessa: 'C.682' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 2, client: 'ESEA', commessa: 'C.709' },
      { article: 'PORTA 800X2000', month: 'MARZO', qty: 1, client: 'MEP', commessa: 'C.722' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 4, client: 'INTEGRA', commessa: 'C.742' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 20, client: 'DOMO', commessa: 'C.758' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 1, client: 'FIMI', commessa: 'C.768' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 3, client: 'EMMEBI', commessa: 'C.787' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 3, client: 'SERTECH', commessa: 'C.794' },
      { article: 'PORTA 800X2000', month: 'APRILE', qty: 28, client: 'R&M', commessa: 'C.797' },
      { article: 'PORTA 800X2200', month: 'MARZO', qty: 1, client: 'PRISMA', commessa: 'C.635' },
      { article: 'PORTA 800X2200', month: 'APRILE', qty: 2, client: 'FIMI', commessa: 'C.771' },
      { article: 'PORTA 1000X1800', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.691' },
      { article: 'PORTA 1000X1800', month: 'MARZO', qty: 1, client: 'JP', commessa: 'C.719' },
      { article: 'PORTA 1000X1800', month: 'APRILE', qty: 3, client: 'JP', commessa: 'C.750' },
      { article: 'PORTA 1000X1800', month: 'APRILE', qty: 2, client: 'BRIZIO', commessa: 'C.751' },
      { article: 'PORTA 1000X1800', month: 'APRILE', qty: 2, client: 'JP', commessa: 'C.762' },
      { article: 'PORTA 1000X2000', month: 'MARZO', qty: 1, client: 'TECNOPRES', commessa: 'C* AGM' },
      { article: 'PORTA 1000X2000', month: 'MARZO', qty: 1, client: 'MEP', commessa: 'C.722' },
      { article: 'PORTA 1000X2000', month: 'APRILE', qty: 1, client: 'ELETRAS', commessa: 'C.743' },
      { article: 'PORTA 1000X2000', month: 'APRILE', qty: 2, client: 'WARACOM', commessa: 'C*AGM' },
      { article: 'PORTA 1000X2000', month: 'APRILE', qty: 1, client: 'EMMEBI', commessa: 'C.787' },

      // 600x1800 ib
      { article: 'PORTA CIECA AG L600 H1800 IN BATTUTA', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.719' },
      { article: 'PORTA CIECA AG L600 H1800 IN BATTUTA', month: 'MARZO', qty: 7, client: 'IND.AMS', commessa: 'C.738' },
      { article: 'PORTA CIECA AG L600 H1800 IN BATTUTA', month: 'APRILE', qty: 2, client: 'SYNTECH', commessa: 'C.788' },
      { article: 'PORTA CIECA AG L600 H1800 IN BATTUTA', month: 'APRILE', qty: 1, client: 'SYNTECH', commessa: 'C.836' },
      
      // 600x1800 cb
      { article: 'PORTA CIECA AG L600 H1800 CON BATTUTA', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.719' },
      { article: 'PORTA CIECA AG L600 H1800 CON BATTUTA', month: 'MARZO', qty: 7, client: 'IND.AMS', commessa: 'C.738' },
      { article: 'PORTA CIECA AG L600 H1800 CON BATTUTA', month: 'APRILE', qty: 2, client: 'SYNTECH', commessa: 'C.788' },
      { article: 'PORTA CIECA AG L600 H1800 CON BATTUTA', month: 'APRILE', qty: 1, client: 'SYNTECH', commessa: 'C.836' },

      // 600x2000 ib
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'MARZO', qty: 3, client: 'VARINELLI', commessa: 'C.510' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'MARZO', qty: 1, client: 'SIRIO', commessa: 'C*AGM' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'MARZO', qty: 1, client: 'MAD', commessa: 'C.662' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'MARZO', qty: 14, client: 'TECNO', commessa: 'C.711' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'MARZO', qty: 1, client: 'MEP', commessa: 'C.722' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'APRILE', qty: 2, client: 'EL.PIAVE', commessa: 'C.745' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'APRILE', qty: 1, client: 'JOYTEK', commessa: 'C.757' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'APRILE', qty: 5, client: 'DOMO', commessa: 'C.758' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'APRILE', qty: 2, client: 'AP2', commessa: 'C.786' },
      { article: 'PORTA CIECA AG L600 H2000 IN BATTUTA', month: 'APRILE', qty: 2, client: 'JP', commessa: 'C.828' },

      // 600x2000 cb
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'MARZO', qty: 3, client: 'VARINELLI', commessa: 'C.510' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'MARZO', qty: 1, client: 'SIRIO', commessa: 'C*AGM' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'MARZO', qty: 1, client: 'MAD', commessa: 'C.662' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'MARZO', qty: 14, client: 'TECNO', commessa: 'C.711' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'MARZO', qty: 1, client: 'MEP', commessa: 'C.722' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 2, client: 'EL.PIAVE', commessa: 'C.745' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 1, client: 'JOYTEK', commessa: 'C.757' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 5, client: 'DOMO', commessa: 'C.758' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 1, client: 'FIMI', commessa: 'C.768' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 2, client: 'AP2', commessa: 'C.786' },
      { article: 'PORTA CIECA AG L600 H2000 CON BATTUTA', month: 'APRILE', qty: 2, client: 'JP', commessa: 'C.828' },

      // 600x2200 ib
      { article: 'PORTA CIECA AG L600 H2200 IN BATTUTA', month: 'MARZO', qty: 1, client: 'PRISMA', commessa: 'C.634' },
      { article: 'PORTA CIECA AG L600 H2200 IN BATTUTA', month: 'APRILE', qty: 2, client: 'EL.PIAVE', commessa: 'C.746' },

      // 600x2200 cb
      { article: 'PORTA CIECA AG L600 H2200 CON BATTUTA', month: 'MARZO', qty: 1, client: 'PRISMA', commessa: 'C.634' },
      { article: 'PORTA CIECA AG L600 H2200 CON BATTUTA', month: 'APRILE', qty: 2, client: 'EL.PIAVE', commessa: 'C.746' },

      // 700x1200 ib
      { article: 'PORTA CIECA AG L700 H1200 IN BATTUTA', month: 'MARZO', qty: 4, client: 'GIDA', commessa: 'C*AGC' },

      // 700x1200 cb
      { article: 'PORTA CIECA AG L700 H1200 CON BATTUTA', month: 'MARZO', qty: 4, client: 'GIDA', commessa: 'C*AGC' },

      // 700x1800 ib
      { article: 'PORTA CIECA AG L700 H1800 IN BATTUTA', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.641' },

      // 700x1800 cb
      { article: 'PORTA CIECA AG L700 H1800 CON BATTUTA', month: 'MARZO', qty: 2, client: 'JP', commessa: 'C.641' },

      // 800X800 IB
      { article: 'PORTA CIECA AG L800 H800 IN BATTUTA', month: 'APRILE', qty: 1, client: 'LAWER', commessa: 'C*AGM' },

      // 800X800 CB
      { article: 'PORTA CIECA AG L800 H800 CON BATTUTA', month: 'APRILE', qty: 1, client: 'LAWER', commessa: 'C*AGM' },

      // 800X1200 IB
      { article: 'PORTA CIECA AG L800 H1200 IN BATTUTA', month: 'APRILE', qty: 1, client: 'LAWER', commessa: 'C*AGM' },

      // 800X1200 CB
      { article: 'PORTA CIECA AG L800 H1200 CON BATTUTA', month: 'APRILE', qty: 1, client: 'LAWER', commessa: 'C*AGM' },

      // 800x1800 ib
      { article: 'PORTA CIECA AG L800 H1800 IN BATTUTA', month: 'MARZO', qty: 1, client: 'SIRIO', commessa: 'C.648' },
      { article: 'PORTA CIECA AG L800 H1800 IN BATTUTA', month: 'MARZO', qty: 2, client: 'ESEA', commessa: 'C.709' },
      { article: 'PORTA CIECA AG L800 H1800 IN BATTUTA', month: 'MARZO', qty: 1, client: 'MAMBRETTI', commessa: 'C.710' },
      { article: 'PORTA CIECA AG L800 H1800 IN BATTUTA', month: 'MARZO', qty: 4, client: 'FDF', commessa: 'C.725' },
      { article: 'PORTA CIECA AG L800 H1800 IN BATTUTA', month: 'APRILE', qty: 1, client: 'MAMBRETTI', commessa: 'C.798' },

      // 800x1800 cb
      { article: 'PORTA CIECA AG L800 H1800 CON BATTUTA', month: 'MARZO', qty: 1, client: 'SIRIO', commessa: 'C.648' },
      { article: 'PORTA CIECA AG L800 H1800 CON BATTUTA', month: 'MARZO', qty: 2, client: 'ESEA', commessa: 'C.709' },
      { article: 'PORTA CIECA AG L800 H1800 CON BATTUTA', month: 'MARZO', qty: 1, client: 'MAMBRETTI', commessa: 'C.710' },
      { article: 'PORTA CIECA AG L800 H1800 CON BATTUTA', month: 'MARZO', qty: 4, client: 'FDF', commessa: 'C.725' },
      { article: 'PORTA CIECA AG L800 H1800 CON BATTUTA', month: 'APRILE', qty: 1, client: 'MAMBRETTI', commessa: 'C.798' },

      // 1000X1000 IB
      { article: 'PORTA CIECA AG L1000 H1000 IN BATTUTA', month: 'MARZO', qty: 4, client: 'FDF', commessa: 'C*' },

      // 1000X1000 CB
      { article: 'PORTA CIECA AG L1000 H1000 CON BATTUTA', month: 'MARZO', qty: 4, client: 'FDF', commessa: 'C*' },

      // 500x1400 ib
      { article: 'PORTA CIECA AG L500 H1400 IN BATTUTA', month: 'APRILE', qty: 2, client: 'MEP', commessa: 'C.793' },
      // 500x1400 cb
      { article: 'PORTA CIECA AG L500 H1400 CON BATTUTA', month: 'APRILE', qty: 2, client: 'MEP', commessa: 'C.793' },
      // 500x2000 ib
      { article: 'PORTA CIECA AG L500 H2000 IN BATTUTA', month: 'MARZO', qty: 1, client: 'MINGAZZINI', commessa: 'C*' },
      // 500x2000 cb
      { article: 'PORTA CIECA AG L500 H2000 CON BATTUTA', month: 'MARZO', qty: 1, client: 'MINGAZZINI', commessa: 'C*' },
    ];

    for (const c of userCommitments) {
      const art = db.prepare('SELECT id FROM articles WHERE nome = ?').get(c.article) as any;
      if (art) {
        // Check if already exists to avoid duplicates
        const exists = db.prepare('SELECT id FROM commitments WHERE articolo_id = ? AND cliente = ? AND commessa = ? AND note = ?').get(art.id, c.client, c.commessa, c.month);
        if (!exists) {
          db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, note, fase_produzione, operatore) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(art.id, c.client, c.commessa, c.qty, c.month, 'Verniciatura', 'System Seed 2026');
        }
      }
    }
  })();
  console.log('Seed and update transaction completed successfully.');
} catch (e) {
  console.error('Error during seed and update transaction:', e);
}

export default db;

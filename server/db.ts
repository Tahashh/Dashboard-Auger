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
    quantita_lanciata INTEGER,
    tempo INTEGER,
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

  CREATE TABLE IF NOT EXISTS macchina_5000 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    articolo TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    preparazione INTEGER DEFAULT 0,
    inizio TEXT,
    inizio2 TEXT,
    pausa TEXT,
    fine TEXT,
    totale_tempo INTEGER,
    odl TEXT,
    stato TEXT DEFAULT 'da tagliare',
    operatore TEXT,
    cliente TEXT,
    commessa TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS taglio_laser (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    articolo TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    preparazione INTEGER DEFAULT 0,
    inizio TEXT,
    inizio2 TEXT,
    pausa TEXT,
    fine TEXT,
    totale_tempo INTEGER,
    odl TEXT,
    stato TEXT DEFAULT 'da tagliare',
    operatore TEXT,
    cliente TEXT,
    commessa TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fase_taglio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lavorazione_per TEXT,
    articolo TEXT,
    quantita INTEGER,
    data TEXT,
    odl TEXT,
    commessa TEXT,
    fatto INTEGER DEFAULT 0,
    stampato INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fase_saldatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lavorazione_per TEXT,
    articolo TEXT,
    quantita INTEGER,
    data TEXT,
    odl TEXT,
    commessa TEXT,
    fatto INTEGER DEFAULT 0,
    stampato INTEGER DEFAULT 0,
    macchina TEXT DEFAULT 'Reparto Saldatura',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS archivio_stampe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lavorazione_per TEXT,
    articolo TEXT,
    quantita INTEGER,
    data TEXT,
    odl TEXT,
    commessa TEXT,
    macchina TEXT,
    timestamp_stampa DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS programmi_eseguiti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lavorazione_per TEXT,
    articolo TEXT,
    quantita INTEGER,
    data TEXT,
    odl TEXT,
    commessa TEXT,
    timestamp_esecuzione DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movimenti_c_gialla (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_reg DATETIME DEFAULT CURRENT_TIMESTAMP,
    articolo_spc TEXT NOT NULL,
    fase TEXT NOT NULL,
    quantita INTEGER NOT NULL,
    cliente_commessa TEXT,
    operatore TEXT,
    tempo_totale INTEGER,
    quantita_lanciata INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS piastre_at (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo TEXT,
    codice TEXT,
    tag INTEGER DEFAULT 0,
    gre INTEGER DEFAULT 0,
    imp INTEGER DEFAULT 0,
    tot INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS porte_at (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo TEXT,
    codice TEXT,
    tag INTEGER DEFAULT 0,
    gre INTEGER DEFAULT 0,
    vern INTEGER DEFAULT 0,
    imp INTEGER DEFAULT 0,
    tot INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS involucro_at (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo TEXT,
    codice TEXT,
    tag INTEGER DEFAULT 0,
    gre INTEGER DEFAULT 0,
    sald INTEGER DEFAULT 0,
    vern INTEGER DEFAULT 0,
    mag INTEGER DEFAULT 0,
    imp INTEGER DEFAULT 0,
    tot INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS casse_complete_at (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    articolo TEXT NOT NULL UNIQUE,
    quantita INTEGER DEFAULT 0,
    impegni INTEGER DEFAULT 0,
    totale INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  DROP TABLE IF EXISTS traverse_inventory;
  
  CREATE TABLE IF NOT EXISTS traverse_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    misura INTEGER NOT NULL,
    quantita INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo, misura)
  );

  CREATE TABLE IF NOT EXISTS agr_requirements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agr_codice TEXT NOT NULL UNIQUE,
    forata_misura INTEGER NOT NULL,
    cieca_misura INTEGER NOT NULL,
    tetto1_misura INTEGER NOT NULL,
    tetto2_misura INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed traverse_inventory
try {
  const traverseData = [
    { tipo: 'forata', misure: [300, 400, 600, 800, 1000, 1200, 1400, 1600, 1800] },
    { tipo: 'cieca', misure: [400, 500, 600, 800, 1000] },
    { tipo: 'tetto1', misure: [300, 400, 600, 800, 1000, 1200, 1400, 1600, 1800] },
    { tipo: 'tetto2', misure: [400, 500, 600, 800, 1000] }
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO traverse_inventory (tipo, misura, quantita) VALUES (?, ?, 5000)');
  for (const item of traverseData) {
    for (const misura of item.misure) {
      insert.run(item.tipo, misura);
    }
  }
} catch (e) {
  console.error('Error seeding traverse_inventory:', e);
}

// Update existing records to 5000
try {
  db.prepare('UPDATE traverse_inventory SET quantita = 5000').run();
} catch (e) {
  console.error('Error updating traverse_inventory quantities:', e);
}

try {
  db.exec('ALTER TABLE fase_taglio ADD COLUMN odl TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE fase_taglio ADD COLUMN fatto INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE fase_taglio ADD COLUMN stampato INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE macchina_5000 ADD COLUMN cliente TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE macchina_5000 ADD COLUMN commessa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE taglio_laser ADD COLUMN cliente TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE taglio_laser ADD COLUMN commessa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE macchina_5000 ADD COLUMN pausa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE macchina_5000 ADD COLUMN inizio2 TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE taglio_laser ADD COLUMN pausa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE taglio_laser ADD COLUMN inizio2 TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE fase_taglio ADD COLUMN commessa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE fase_taglio ADD COLUMN macchina TEXT DEFAULT "Macchina 5000";');
} catch (e) {}

try {
  db.exec('ALTER TABLE archivio_stampe ADD COLUMN macchina TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE archivio_stampe ADD COLUMN odl TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE archivio_stampe ADD COLUMN commessa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE programmi_eseguiti ADD COLUMN odl TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE programmi_eseguiti ADD COLUMN commessa TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE piastre_at ADD COLUMN imp INTEGER DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE porte_at ADD COLUMN imp INTEGER DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE involucro_at ADD COLUMN imp INTEGER DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE piastre_at ADD COLUMN codice TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE porte_at ADD COLUMN articolo TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE porte_at ADD COLUMN codice TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE involucro_at ADD COLUMN articolo TEXT;');
} catch (e) {}
try {
  db.exec('ALTER TABLE involucro_at ADD COLUMN codice TEXT;');
} catch (e) {}

// Seed agr_requirements
try {
  const seedRequirements = [
    { agr_codice: 'AGR0304', forata: 300, cieca: 400, tetto1: 300, tetto2: 400 },
    { agr_codice: 'AGR0305', forata: 300, cieca: 400, tetto1: 300, tetto2: 400 },
    { agr_codice: 'AGR0306', forata: 300, cieca: 400, tetto1: 300, tetto2: 400 },
    { agr_codice: 'AGR0404', forata: 400, cieca: 400, tetto1: 400, tetto2: 400 },
    { agr_codice: 'AGR0405', forata: 400, cieca: 500, tetto1: 400, tetto2: 500 },
    { agr_codice: 'AGR0406', forata: 400, cieca: 600, tetto1: 400, tetto2: 600 },
    { agr_codice: 'AGR0408', forata: 400, cieca: 800, tetto1: 400, tetto2: 800 },
    { agr_codice: 'AGR0410', forata: 400, cieca: 1000, tetto1: 400, tetto2: 1000 },
    { agr_codice: 'AGR0604', forata: 600, cieca: 400, tetto1: 600, tetto2: 400 },
    { agr_codice: 'AGR0605', forata: 600, cieca: 500, tetto1: 600, tetto2: 500 },
    { agr_codice: 'AGR0606', forata: 600, cieca: 600, tetto1: 600, tetto2: 600 },
    { agr_codice: 'AGR0608', forata: 600, cieca: 800, tetto1: 600, tetto2: 800 },
    { agr_codice: 'AGR0610', forata: 600, cieca: 1000, tetto1: 600, tetto2: 1000 },
    { agr_codice: 'AGR0804', forata: 800, cieca: 400, tetto1: 800, tetto2: 400 },
    { agr_codice: 'AGR0805', forata: 800, cieca: 500, tetto1: 800, tetto2: 500 },
    { agr_codice: 'AGR0806', forata: 800, cieca: 600, tetto1: 800, tetto2: 600 },
    { agr_codice: 'AGR0808', forata: 800, cieca: 800, tetto1: 800, tetto2: 800 },
    { agr_codice: 'AGR0810', forata: 800, cieca: 1000, tetto1: 800, tetto2: 1000 },
    { agr_codice: 'AGR1004', forata: 1000, cieca: 400, tetto1: 1000, tetto2: 400 },
    { agr_codice: 'AGR1005', forata: 1000, cieca: 500, tetto1: 1000, tetto2: 500 },
    { agr_codice: 'AGR1006', forata: 1000, cieca: 600, tetto1: 1000, tetto2: 600 },
    { agr_codice: 'AGR1008', forata: 1000, cieca: 800, tetto1: 1000, tetto2: 800 },
    { agr_codice: 'AGR1010', forata: 1000, cieca: 1000, tetto1: 1000, tetto2: 1000 },
    { agr_codice: 'AGR1204', forata: 1200, cieca: 400, tetto1: 1200, tetto2: 400 },
    { agr_codice: 'AGR1205', forata: 1200, cieca: 500, tetto1: 1200, tetto2: 500 },
    { agr_codice: 'AGR1206', forata: 1200, cieca: 600, tetto1: 1200, tetto2: 600 },
    { agr_codice: 'AGR1208', forata: 1200, cieca: 800, tetto1: 1200, tetto2: 800 },
    { agr_codice: 'AGR1210', forata: 1200, cieca: 1000, tetto1: 1200, tetto2: 1000 },
    { agr_codice: 'AGR1212', forata: 1200, cieca: 1000, tetto1: 1200, tetto2: 1000 },
    { agr_codice: 'AGR1404', forata: 1400, cieca: 400, tetto1: 1400, tetto2: 400 },
    { agr_codice: 'AGR1405', forata: 1400, cieca: 500, tetto1: 1400, tetto2: 500 },
    { agr_codice: 'AGR1406', forata: 1400, cieca: 600, tetto1: 1400, tetto2: 600 },
    { agr_codice: 'AGR1408', forata: 1400, cieca: 800, tetto1: 1400, tetto2: 800 },
    { agr_codice: 'AGR1410', forata: 1400, cieca: 1000, tetto1: 1400, tetto2: 1000 },
    { agr_codice: 'AGR1604', forata: 1600, cieca: 400, tetto1: 1600, tetto2: 400 },
    { agr_codice: 'AGR1605', forata: 1600, cieca: 500, tetto1: 1600, tetto2: 500 },
    { agr_codice: 'AGR1606', forata: 1600, cieca: 600, tetto1: 1600, tetto2: 600 },
    { agr_codice: 'AGR1608', forata: 1600, cieca: 800, tetto1: 1600, tetto2: 800 },
    { agr_codice: 'AGR1610', forata: 1600, cieca: 1000, tetto1: 1600, tetto2: 1000 },
    { agr_codice: 'AGR1804', forata: 1800, cieca: 400, tetto1: 1800, tetto2: 400 },
    { agr_codice: 'AGR1805', forata: 1800, cieca: 500, tetto1: 1800, tetto2: 500 },
    { agr_codice: 'AGR1806', forata: 1800, cieca: 600, tetto1: 1800, tetto2: 600 }
  ];
  const stmt = db.prepare('INSERT OR IGNORE INTO agr_requirements (agr_codice, forata_misura, cieca_misura, tetto1_misura, tetto2_misura) VALUES (?, ?, ?, ?, ?)');
  const insertMany = db.transaction((reqs) => {
    for (const r of reqs) stmt.run(r.agr_codice, r.forata, r.cieca, r.tetto1, r.tetto2);
  });
  insertMany(seedRequirements);
} catch (e) {
  console.error('Error seeding agr_requirements:', e);
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
    
    if (upperName.includes('PORTA AT') || upperCode.startsWith('AT-PO')) return 'PORTE AT';
    if (upperName.includes('PIASTRA AT') || upperCode.startsWith('AT-PA')) return 'PIASTRE AT';
    if (upperName.includes('INVOLUCRO AT') || upperCode.startsWith('AT-IN')) return 'INVOLUCRI AT';

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
    if (upperName.includes('PIASTRA')) {
      if (upperName.includes('LATERALE')) return 'Piastre Laterali';
      return 'Piastre Frontali';
    }
    if (upperName.includes('LATERALE') || upperName.includes('LAT.')) {
      if (upperCode.includes('LB') || upperName.includes('IBRIDO')) return 'Laterali Ibridi';
      return 'Laterali';
    }
    if (upperName.includes('TETTO') && !upperName.includes('STT AGR')) return 'Tetti';
    if (upperName.includes('BASI&TETTI') || (upperName.includes('BASI') && upperName.includes('TETTI'))) return 'Basi&Tetti';

    if (upperName.includes('STRUTTURE AGM') || upperName.includes('STRUTTURA AGM') || upperCode.startsWith('AGM')) return 'Strutture AGM';
    if (upperName.includes('STRUTTURE AGR') || upperName.includes('STRUTTURA AGR')) return 'Strutture Agr';
    if (upperName.includes('AGS')) return 'AGS';
    if (upperName.includes('AGC')) return 'AGC';
    if (upperName.includes('AGLM')) return 'AGLM';
    if (upperName.includes('AGLC')) return 'AGLC';
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
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_lamiera REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_taglio REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_piega REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_verniciatura REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_gommatura REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_montaggio REAL DEFAULT 0;');
} catch (e) {}
try {
  db.exec('ALTER TABLE articles ADD COLUMN prezzo_vendita REAL DEFAULT 0;');
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

try {
  db.exec('ALTER TABLE movements_log ADD COLUMN tempo INTEGER;');
} catch (e) {}

try {
  db.exec("DELETE FROM articles WHERE nome LIKE 'PORTA AT %' AND famiglia = 'PORTE';");
  db.exec("DELETE FROM articles WHERE nome LIKE 'INVOLUCRO AT%' AND famiglia = 'INVOLUCRI AT';");
  console.log('Removed PORTA AT and INVOLUCRO AT from standard articles table.');
} catch (e) {
  console.error('Error removing AT items from articles:', e);
}

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
  { nome: 'PIASTRA AT 200X300', codice: 'AT-PA0203', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 250X300', codice: 'AT-PA02503', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 300X300', codice: 'AT-PA0303', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 300X400', codice: 'AT-PA0304', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 300X500', codice: 'AT-PA0305', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 400X300', codice: 'AT-PA0403', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 400X400', codice: 'AT-PA0404', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 400X500', codice: 'AT-PA0405', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 400X600', codice: 'AT-PA0406', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 500X500', codice: 'AT-PA0505', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 500X700', codice: 'AT-PA0507', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 600X400', codice: 'AT-PA0604', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 600X600', codice: 'AT-PA0606', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 600X800', codice: 'AT-PA0608', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 600X1000', codice: 'AT-PA0610', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 600X1200', codice: 'AT-PA0612', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 800X600', codice: 'AT-PA0806', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 800X800', codice: 'AT-PA0808', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 800X1000', codice: 'AT-PA0810', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 800X1200', codice: 'AT-PA0812', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1000X800', codice: 'AT-PA1008', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1000X1000', codice: 'AT-PA1010', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1000X1200', codice: 'AT-PA1012', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1000X1400', codice: 'AT-PA1014', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1200X800', codice: 'AT-PA1208', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1200X1000', codice: 'AT-PA1210', famiglia: 'PIASTRE AT' },
  { nome: 'PIASTRA AT 1200X1200', codice: 'AT-PA1212', famiglia: 'PIASTRE AT' },
  { nome: 'PORTA AT 200X300 STD', codice: 'AT-PO0203-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 250X300 STD', codice: 'AT-PO02503-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 300X300 STD', codice: 'AT-PO0303-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 300X400 STD', codice: 'AT-PO0304-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 300X500 STD', codice: 'AT-PO0305-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 400X300 STD', codice: 'AT-PO0403-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 400X400 STD', codice: 'AT-PO0404-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 400X500 STD', codice: 'AT-PO0405-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 400X600 STD', codice: 'AT-PO0406-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 500X500 STD', codice: 'AT-PO0505-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 500X700 STD', codice: 'AT-PO0507-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 600X400 STD', codice: 'AT-PO0604-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 600X600 STD', codice: 'AT-PO0606-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 600X800 STD', codice: 'AT-PO0608-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 600X1000 STD', codice: 'AT-PO0610-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 600X1200 STD', codice: 'AT-PO0612-STD', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X600 IB', codice: 'AT-PO0806-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X600 CB', codice: 'AT-PO0806-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X800 IB', codice: 'AT-PO0808-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X800 CB', codice: 'AT-PO0808-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X1000 IB', codice: 'AT-PO0810-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X1000 CB', codice: 'AT-PO0810-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X1200 IB', codice: 'AT-PO0812-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 800X1200 CB', codice: 'AT-PO0812-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X800 IB', codice: 'AT-PO1008-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X800 CB', codice: 'AT-PO1008-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1000 IB', codice: 'AT-PO1010-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1000 CB', codice: 'AT-PO1010-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1200 IB', codice: 'AT-PO1012-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1200 CB', codice: 'AT-PO1012-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1400 IB', codice: 'AT-PO1014-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1000X1400 CB', codice: 'AT-PO1014-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X800 IB', codice: 'AT-PO1208-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X800 CB', codice: 'AT-PO1208-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X1000 IB', codice: 'AT-PO1210-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X1000 CB', codice: 'AT-PO1210-CB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X1200 IB', codice: 'AT-PO1212-IB', famiglia: 'PORTE AT' },
  { nome: 'PORTA AT 1200X1200 CB', codice: 'AT-PO1212-CB', famiglia: 'PORTE AT' },
  { nome: 'INVOLUCRO AT 200X300X150', codice: 'AT-IN2315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 250X300X150', codice: 'AT-IN25315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X300X150', codice: 'AT-IN3315', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X150', codice: 'AT-IN3415', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X400X200', codice: 'AT-IN3420', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X150', codice: 'AT-IN3515', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X200', codice: 'AT-IN3520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 300X500X250', codice: 'AT-IN3525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X400X200', codice: 'AT-IN4420', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X150', codice: 'AT-IN4515', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X200', codice: 'AT-IN4520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X500X250', codice: 'AT-IN4525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X200', codice: 'AT-IN4620', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 400X600X250', codice: 'AT-IN4625', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X200', codice: 'AT-IN5520', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X500X250', codice: 'AT-IN5525', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X200', codice: 'AT-IN5720', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 500X700X250', codice: 'AT-IN5725', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X400X400', codice: 'AT-IN6440', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X200', codice: 'AT-IN6620', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X250', codice: 'AT-IN6625', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X300', codice: 'AT-IN6630', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X600X400', codice: 'AT-IN6640', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X200', codice: 'AT-IN6820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X250', codice: 'AT-IN6825', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X300', codice: 'AT-IN6830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X800X400', codice: 'AT-IN6840', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X250', codice: 'AT-IN61025', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X300', codice: 'AT-IN61030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1000X400', codice: 'AT-IN61040', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 600X1200X300', codice: 'AT-IN61230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X200', codice: 'AT-IN8820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X800X300', codice: 'AT-IN8830', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X250', codice: 'AT-IN81025', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1000X300', codice: 'AT-IN81030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 800X1200X300', codice: 'AT-IN81230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X800X200', codice: 'AT-IN10820', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1000X300', codice: 'AT-IN101030', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1000X400', codice: 'AT-IN101040', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1200X300', codice: 'AT-IN101230', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1000X1400X300', codice: 'AT-IN101430', famiglia: 'INVOLUCRI AT' },
  { nome: 'INVOLUCRO AT 1200X1200X300', codice: 'AT-IN121230', famiglia: 'INVOLUCRI AT' },
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
  { nome: 'PANNELLO RETRO AG L2000 H1000', codice: 'AG-RE2010', famiglia: 'PANNELLI RETRO' },  { nome: 'PIASTRA CIECA AG INS. FRONTALE 300X2000', codice: 'AG-PA0320F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1400', codice: 'AG-PA0414F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1600', codice: 'AG-PA0416F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X1800', codice: 'AG-PA0418F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X2000', codice: 'AG-PA0420F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 400X2200', codice: 'AG-PA0422F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1000', codice: 'AG-PA0610F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1200', codice: 'AG-PA0612F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1400', codice: 'AG-PA0614F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1600', codice: 'AG-PA0616F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X1800', codice: 'AG-PA0618F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X2000', codice: 'AG-PA0620F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 600X2200', codice: 'AG-PA0622F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1000', codice: 'AG-PA0810F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1200', codice: 'AG-PA0812F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1400', codice: 'AG-PA0814F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1600', codice: 'AG-PA0816F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X1800', codice: 'AG-PA0818F', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. FRONTALE 800X2000', codice: 'AG-PA0820F', famiglia: 'PIASTRE' },
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
  { nome: 'PIASTRA CIECA AG INS. LATERALE 300X2000', codice: 'AG-PA0320L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 400X1400', codice: 'AG-PA0414L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 400X1600', codice: 'AG-PA0416L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 400X1800', codice: 'AG-PA0418L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 400X2000', codice: 'AG-PA0420L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 400X2200', codice: 'AG-PA0422L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X1000', codice: 'AG-PA0610L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X1200', codice: 'AG-PA0612L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X1400', codice: 'AG-PA0614L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X1600', codice: 'AG-PA0616L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X1800', codice: 'AG-PA0618L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X2000', codice: 'AG-PA0620L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 600X2200', codice: 'AG-PA0622L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X1000', codice: 'AG-PA0810L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X1200', codice: 'AG-PA0812L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X1400', codice: 'AG-PA0814L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X1600', codice: 'AG-PA0816L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X1800', codice: 'AG-PA0818L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X2000', codice: 'AG-PA0820L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 800X2200', codice: 'AG-PA0822L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1000X1000', codice: 'AG-PA1010L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1000X1200', codice: 'AG-PA1012L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1000X1400', codice: 'AG-PA1014L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1000X1600', codice: 'AG-PA1016L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1000X2200', codice: 'AG-PA1022L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X800', codice: 'AG-PA1208L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X1000', codice: 'AG-PA1210L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X1200', codice: 'AG-PA1212L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X1400', codice: 'AG-PA1214L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X1600', codice: 'AG-PA1216L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1200X2200', codice: 'AG-PA1222L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X800', codice: 'AG-PA1408L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X1000', codice: 'AG-PA1410L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X1200', codice: 'AG-PA1412L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X1800', codice: 'AG-PA1418L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X2000', codice: 'AG-PA1420L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1400X2200', codice: 'AG-PA1422L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X800', codice: 'AG-PA1608L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X1000', codice: 'AG-PA1610L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X1200', codice: 'AG-PA1612L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X1400', codice: 'AG-PA1614L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X1800', codice: 'AG-PA1618L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X2000', codice: 'AG-PA1620L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1600X2200', codice: 'AG-PA1622L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1800X1000', codice: 'AG-PA1810L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 1800X1200', codice: 'AG-PA1812L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 2000X800', codice: 'AG-PA2008L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 2000X1000', codice: 'AG-PA2010L', famiglia: 'PIASTRE' },
  { nome: 'PIASTRA CIECA AG INS. LATERALE 2000X1200', codice: 'AG-PA2012L', famiglia: 'PIASTRE' },
];

// Generate Strutture AGR articles
const widths = [300, 400, 600, 800, 1000, 1200, 1400, 1600, 1800];
const heights = [400, 500, 600, 800, 1000, 1200];

for (const w of widths) {
  for (const h of heights) {
    if (w === 300 && h > 600) continue;
    if (w === 400 && h > 1000) continue;
    if (w === 600 && h > 1000) continue;
    if (w === 800 && h > 1000) continue;
    if (w === 1000 && h > 1000) continue;
    if (w === 1200 && h > 1200) continue;
    if (w === 1400 && h > 1000) continue;
    if (w === 1600 && h > 1000) continue;
    if (w === 1800 && h > 600) continue;

    const wStr = (w / 100).toString().padStart(2, '0');
    const hStr = (h / 100).toString().padStart(2, '0');
    
    seedArticles.push({ 
      nome: `STT AGR BASE ${w}X${h}`, 
      codice: `AGR-STB${wStr}${hStr}`, 
      famiglia: 'Strutture Agr' 
    });
    seedArticles.push({ 
      nome: `STT AGR TETTO ${w}X${h}`, 
      codice: `AGR-STT${wStr}${hStr}`, 
      famiglia: 'Strutture Agr' 
    });
    
    // User requested STRUTTURA AGR articles
    seedArticles.push({
      nome: `STRUTTURA AGR ${w}X${h}`,
      codice: `AGR${wStr}${hStr}`,
      famiglia: 'Strutture Agr'
    });
  }
}

// Ensure AGR1212 is also included as it's in the user's list
seedArticles.push({
  nome: 'STRUTTURA AGR 1200X1200',
  codice: 'AGR1212',
  famiglia: 'Strutture Agr'
});

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

    // Rimuovi vecchie Porte AT senza tipo
    db.prepare("DELETE FROM articles WHERE famiglia = 'PORTE AT' AND nome NOT LIKE '% STD' AND nome NOT LIKE '% IB' AND nome NOT LIKE '% CB'").run();

    for (const art of seedArticles) {
      const res = insertArticle.run(art.nome, art.codice, (art as any).famiglia || null);
      if (res.changes === 0) {
        // Update existing articles to ensure they have the correct name and family
        db.prepare('UPDATE articles SET nome = ?, famiglia = ? WHERE codice = ?').run(art.nome, (art as any).famiglia || null, art.codice);
      }
      if (art.codice.startsWith('AGR')) {
        // console.log(`Seeded/Updated AGR article: ${art.codice}`);
      }
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

    /*
    for (const c of userCommitments) {
      ...
    }
    */
    
    // Reset all commitments and impegni_clienti for a clean slate
    try {
      db.exec('DELETE FROM commitments');
      db.exec('UPDATE articles SET impegni_clienti = 0');
      console.log('Database cleared: commitments deleted, impegni_clienti reset.');
    } catch (e) {
      console.error("Error resetting commitments:", e);
    }

    // Migration to update old movement logs to the new 'Scarico' phase and 'scarico da commessa' type
    try {
      db.exec(`
        UPDATE movements_log 
        SET fase = 'Scarico', tipo = 'scarico da commessa' 
        WHERE tipo IN ('evasione', 'Evasione Commessa', 'spedizione commessa')
           OR (tipo = 'scarico' AND (fase IN ('impegni', 'spedizione', 'impegni_evasione', 'impegni_evasione_commessa', 'spedizione commessa') OR fase IS NULL));
      `);
      console.log('Movement log migration completed successfully.');
    } catch (e) {
      console.error('Error during movement log migration:', e);
    }
  })();
  console.log('Seed and update transaction completed successfully.');
} catch (e) {
  console.error('Error during seed and update transaction:', e);
}

export default db;

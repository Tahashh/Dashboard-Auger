import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './server/db.ts';
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import fs from 'fs';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import webpush from 'web-push';

// Setup VAPID keys for push notifications
const VAPID_KEYS_PATH = path.join(process.cwd(), 'vapid_keys.json');
let vapidKeys: { publicKey: string, privateKey: string };

if (existsSync(VAPID_KEYS_PATH)) {
  vapidKeys = JSON.parse(readFileSync(VAPID_KEYS_PATH, 'utf-8'));
} else {
  vapidKeys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_KEYS_PATH, JSON.stringify(vapidKeys));
}

webpush.setVapidDetails(
  'mailto:admin@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Setup Archive Directory
const ARCHIVE_DIR = path.join(process.cwd(), 'archives');
if (!existsSync(ARCHIVE_DIR)) {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
}

const upload = multer({ dest: 'uploads/' });

function archiveOldMovements() {
  // L'utente ha richiesto che i movimenti non vengano MAI cancellati.
  // Questa funzione è stata disabilitata per prevenire la perdita di dati.
}

// Run archiving process on startup and then every 24 hours
archiveOldMovements();
setInterval(archiveOldMovements, 24 * 60 * 60 * 1000);

console.log('Starting server...');

async function startServer() {
  console.log('Initializing express app...');
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  console.log('Express middleware configured.');

  // --- API Routes ---

  const CHAT_AUTHORIZED_USERS = ['LucaTurati', 'TahaJbala'];

  // Chat Messages
  app.get('/api/chat/messages', (req, res) => {
    const { username } = req.query;
    if (!username || !CHAT_AUTHORIZED_USERS.includes(username as string)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    try {
      const messages = db.prepare('SELECT * FROM chat_messages ORDER BY timestamp ASC').all();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/chat/messages', (req, res) => {
    const { sender, text } = req.body;
    if (!sender || !CHAT_AUTHORIZED_USERS.includes(sender)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    try {
      const stmt = db.prepare('INSERT INTO chat_messages (sender, text) VALUES (?, ?)');
      const info = stmt.run(sender, text);
      const newMessage = { id: info.lastInsertRowid, sender, text, timestamp: new Date().toISOString() };
      
      // Broadcast to authorized users
      const broadcastMsg = JSON.stringify({ type: 'chat_message', message: newMessage });
      wss.clients.forEach(client => {
        const session = connectedUsers.get(client);
        if (client.readyState === WebSocket.OPEN && session && CHAT_AUTHORIZED_USERS.includes(session.username)) {
          client.send(broadcastMsg);
        }
      });

      res.json(newMessage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUsers = ['LucaTurati', 'RobertoBonalumi', 'SamantaLimonta', 'TahaJbala', 'AdeleTurati', 'robertobonalumi'];
    
    // Case-insensitive check
    const matchedUser = validUsers.find(u => u.toLowerCase() === username.toLowerCase());
    
    if (!matchedUser) {
      return res.status(401).json({ error: 'Utente non autorizzato' });
    }
    
    if (password !== 'Auger2014') {
      return res.status(401).json({ error: 'Password errata' });
    }

    res.json({ success: true, username: matchedUser });
  });

  // Articles CRUD
  app.get('/api/articles', (req, res) => {
    try {
      const articles = db.prepare(`
        SELECT a.*, p.piega 
        FROM articles a 
        LEFT JOIN processes p ON a.id = p.articolo_id
        GROUP BY a.id
        ORDER BY a.codice ASC
      `).all();
      res.json(articles);
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/articles', (req, res) => {
    const { nome, codice, verniciati = 0, impegni_clienti = 0, piega = 0, prezzo = 0, scorta = 10 } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, prezzo, scorta) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(nome, codice, verniciati, impegni_clienti, piega, prezzo, scorta);
      
      // Create associated process record
      const processStmt = db.prepare('INSERT INTO processes (articolo_id, piega, verniciatura) VALUES (?, ?, ?)');
      processStmt.run(info.lastInsertRowid, piega, verniciati);

      res.json({ id: info.lastInsertRowid, nome, codice, verniciati, impegni_clienti, piega, prezzo, scorta });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Codice articolo già esistente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    try {
      const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Articolo non trovato' });
      }

      const nome = req.body.nome !== undefined ? req.body.nome : existing.nome;
      const codice = req.body.codice !== undefined ? req.body.codice : existing.codice;
      const verniciati = req.body.verniciati !== undefined ? req.body.verniciati : existing.verniciati;
      const impegni_clienti = req.body.impegni_clienti !== undefined ? req.body.impegni_clienti : existing.impegni_clienti;
      const piega = req.body.piega !== undefined ? req.body.piega : existing.piega;
      const prezzo = req.body.prezzo !== undefined ? req.body.prezzo : existing.prezzo;
      const scorta = req.body.scorta !== undefined ? req.body.scorta : existing.scorta;

      const stmt = db.prepare('UPDATE articles SET nome = ?, codice = ?, verniciati = ?, impegni_clienti = ?, piega = ?, prezzo = ?, scorta = ? WHERE id = ?');
      stmt.run(nome, codice, verniciati, impegni_clienti, piega, prezzo, scorta, id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Codice articolo già esistente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.delete('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
      stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Clients CRUD
  app.get('/api/clients', (req, res) => {
    try {
      const clients = db.prepare('SELECT * FROM clients ORDER BY nome ASC').all();
      res.json(clients);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/clients', (req, res) => {
    const { nome, email = null, telefono = null } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO clients (nome, email, telefono) VALUES (?, ?, ?)');
      const info = stmt.run(nome, email, telefono);
      res.json({ id: info.lastInsertRowid, nome, email, telefono });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Cliente già esistente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const { nome, email = null, telefono = null } = req.body;
    try {
      const stmt = db.prepare('UPDATE clients SET nome = ?, email = ?, telefono = ? WHERE id = ?');
      stmt.run(nome, email, telefono, id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Cliente già esistente' });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
      stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Processes CRUD
  app.get('/api/processes', (req, res) => {
    try {
      const processes = db.prepare(`
        SELECT p.*, a.nome as articolo_nome, a.codice as articolo_codice 
        FROM processes p 
        JOIN articles a ON p.articolo_id = a.id
        ORDER BY a.codice ASC
      `).all();
      res.json(processes);
    } catch (error: any) {
      console.error('Error fetching processes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/processes/:id', (req, res) => {
    const { id } = req.params;
    try {
      const existing = db.prepare('SELECT * FROM processes WHERE id = ?').get(id) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Processo non trovato' });
      }

      const taglio = req.body.taglio !== undefined ? req.body.taglio : existing.taglio;
      const piega = req.body.piega !== undefined ? req.body.piega : existing.piega;
      const saldatura = req.body.saldatura !== undefined ? req.body.saldatura : existing.saldatura;
      const verniciatura = req.body.verniciatura !== undefined ? req.body.verniciatura : existing.verniciatura;

      const stmt = db.prepare('UPDATE processes SET taglio = ?, piega = ?, saldatura = ?, verniciatura = ? WHERE id = ?');
      stmt.run(taglio, piega, saldatura, verniciatura, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/import/processes', (req, res) => {
    const { nome, taglio, piega, saldatura, verniciatura } = req.body;
    try {
      const transaction = db.transaction(() => {
        // Find article by nome or codice
        let article;
        if (nome) {
          article = db.prepare('SELECT id FROM articles WHERE nome = ? OR codice = ?').get(nome, nome) as any;
        }

        if (!article) {
          throw new Error(`Articolo non trovato: ${nome}`);
        }

        const articolo_id = article.id;

        // Update processes
        const t = parseInt(taglio) || 0;
        const p = parseInt(piega) || 0;
        const s = parseInt(saldatura) || 0;
        const v = parseInt(verniciatura) || 0;

        db.prepare(`UPDATE processes SET taglio = ?, piega = ?, saldatura = ?, verniciatura = ? WHERE articolo_id = ?`)
          .run(t, p, s, v, articolo_id);
        
        // Also update verniciati and piega in articles table to match verniciatura and piega
        db.prepare(`UPDATE articles SET verniciati = ?, piega = ? WHERE id = ?`)
          .run(v, p, articolo_id);

        // Handle parsed commitments
        const parsed_commitments = req.body.parsed_commitments;
        if (parsed_commitments && Array.isArray(parsed_commitments)) {
          for (const c of parsed_commitments) {
            // Check if already exists to avoid duplicates
            const existing = db.prepare('SELECT id FROM commitments WHERE articolo_id = ? AND commessa = ? AND cliente = ? AND quantita = ?').get(articolo_id, c.commessa, c.cliente, c.quantita);
            if (!existing) {
              db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, fase_produzione, operatore, stato_lavorazione) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(articolo_id, c.cliente, c.commessa, c.quantita, 'Generico', 'Importazione Excel', 'Pianificato');
              
              db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(c.quantita, articolo_id);
              
              db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(articolo_id, 'impegni_import', 'carico', c.quantita, 'System', c.cliente, c.commessa);
            }
          }
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

   // Webhook for Google Sheets Auto-Sync
  app.post('/api/webhook/lavorazioni', (req, res) => {
    console.log("WEBHOOK RECEIVED:", JSON.stringify(req.body, null, 2));
    const { nome, taglio, piega, saldatura, verniciatura, note, scorta, impegni_clienti } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: "Il campo 'nome' è obbligatorio" });
    }

    try {
      const transaction = db.transaction(() => {
        // 1. Trova l'articolo (case-insensitive)
        let article = db.prepare('SELECT id, impegni_clienti FROM articles WHERE LOWER(nome) = LOWER(?) OR LOWER(codice) = LOWER(?)').get(nome, nome) as any;

        let articolo_id;
        if (!article) {
          console.log(`Articolo non trovato: ${nome}. Creazione in corso...`);
          // Crea l'articolo se non esiste
          const sc = scorta !== undefined ? parseInt(scorta) || 0 : 0;
          const imp = impegni_clienti !== undefined ? parseInt(impegni_clienti) || 0 : 0;
          const result = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega, scorta, prezzo) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(nome, nome, 0, imp, 0, sc, 0);
          articolo_id = result.lastInsertRowid;
        } else {
          articolo_id = article.id;
          console.log(`Articolo trovato: ${nome} (ID: ${articolo_id})`);
        }

        // Assicurati che esista un record in processes per questo articolo
        db.prepare('INSERT OR IGNORE INTO processes (articolo_id) VALUES (?)').run(articolo_id);

        // 2. Aggiorna le fasi di lavorazione
        const existingProcess = db.prepare('SELECT * FROM processes WHERE articolo_id = ?').get(articolo_id) as any;
        
        const t = taglio !== undefined ? (parseInt(taglio) || 0) : (existingProcess?.taglio || 0);
        const p = piega !== undefined ? (parseInt(piega) || 0) : (existingProcess?.piega || 0);
        const s = saldatura !== undefined ? (parseInt(saldatura) || 0) : (existingProcess?.saldatura || 0);
        const v = verniciatura !== undefined ? (parseInt(verniciatura) || 0) : (existingProcess?.verniciatura || 0);

        console.log(`Aggiornamento fasi per ID ${articolo_id}: T=${t}, P=${p}, S=${s}, V=${v}`);

        db.prepare(`UPDATE processes SET taglio = ?, piega = ?, saldatura = ?, verniciatura = ? WHERE articolo_id = ?`)
          .run(t, p, s, v, articolo_id);
        
        // 3. Gestione Impegni (Note)
        const existingArticle = db.prepare('SELECT * FROM articles WHERE id = ?').get(articolo_id) as any;
        
        // Se ci sono note, rimuoviamo i vecchi impegni sincronizzati per questo articolo per evitare duplicati
        if (note && typeof note === 'string') {
          // Se il payload ha un impegni_clienti esplicito, usiamo quello come base, altrimenti 0
          let totalImpegni = impegni_clienti !== undefined ? (parseInt(impegni_clienti) || 0) : 0;
          
          // Rimuovi impegni precedenti sincronizzati
          db.prepare("DELETE FROM commitments WHERE articolo_id = ? AND operatore = 'Google Sheets Sync'").run(articolo_id);
          
          const lines = note.split(/\n|,|;/).map(l => l.trim()).filter(l => l);
          for (const line of lines) {
            const commessaMatch = line.match(/c\.?\s*\d+/i);
            const commessa = commessaMatch ? commessaMatch[0].toUpperCase().replace(/\s+/g, '') : 'C.GENERIC';
            
            const lineWithoutCommessa = line.replace(/c\.?\s*\d+/i, '');
            const qtaMatch = lineWithoutCommessa.match(/\b\d+\b/);
            const quantita = qtaMatch ? parseInt(qtaMatch[0]) : 0;
            
            let cliente = lineWithoutCommessa.replace(/\b\d+\b/, '').replace(/pz|pezzi/i, '').replace(/[-_]/g, ' ').trim();
            cliente = cliente.replace(/\s{2,}/g, ' ').replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').trim();
            if (!cliente) cliente = 'Cliente Ignoto';

            if (quantita > 0) {
              const articleName = String(nome).toUpperCase();
              const phase = articleName.includes('PIASTRA') ? 'Piega' : 'Verniciatura';
              
              db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, fase_produzione, operatore, stato_lavorazione) VALUES (?, ?, ?, ?, ?, ?, ?)')
                .run(articolo_id, cliente, commessa, quantita, phase, 'Google Sheets Sync', 'Pianificato');
              
              totalImpegni += quantita;

              db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
                .run(articolo_id, 'impegni_import', 'carico', quantita, 'System', cliente, commessa);
            }
          }
          
          const finalV = verniciatura !== undefined ? v : (existingArticle?.verniciati || 0);
          const finalP = piega !== undefined ? p : (existingArticle?.piega || 0);

          console.log(`Aggiornamento articolo ID ${articolo_id}: V=${finalV}, P=${finalP}, Imp=${totalImpegni}`);
          db.prepare(`UPDATE articles SET verniciati = ?, piega = ?, impegni_clienti = ? WHERE id = ?`)
            .run(finalV, finalP, totalImpegni, articolo_id);
        } else {
          // Se non ci sono note, aggiorna solo i campi base
          let updateQuery = `UPDATE articles SET verniciati = ?, piega = ?`;
          const updateParams: any[] = [
            verniciatura !== undefined ? v : (existingArticle?.verniciati || 0),
            piega !== undefined ? p : (existingArticle?.piega || 0)
          ];
          
          if (scorta !== undefined) {
            updateQuery += `, scorta = ?`;
            updateParams.push(parseInt(scorta) || 0);
          }
          
          if (impegni_clienti !== undefined) {
            updateQuery += `, impegni_clienti = ?`;
            updateParams.push(parseInt(impegni_clienti) || 0);
          }
          
          updateQuery += ` WHERE id = ?`;
          updateParams.push(articolo_id);
          
          console.log(`Aggiornamento articolo ID ${articolo_id} (senza note)`);
          db.prepare(updateQuery).run(...updateParams);
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Movements
  app.get('/api/movements', (req, res) => {
    try {
      const movements = db.prepare(`
        SELECT m.*, a.nome as articolo_nome, a.codice as articolo_codice 
        FROM movements_log m 
        JOIN articles a ON m.articolo_id = a.id
        ORDER BY m.timestamp DESC
      `).all();
      res.json(movements);
    } catch (error: any) {
      console.error('Error fetching movements:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/movements/archives', (req, res) => {
    try {
      if (!existsSync(ARCHIVE_DIR)) {
        return res.json([]);
      }
      const files = readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.json'));
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/movements/archives/:filename', (req, res) => {
    const { filename } = req.params;
    const filepath = path.join(ARCHIVE_DIR, filename);
    if (existsSync(filepath)) {
      res.download(filepath);
    } else {
      res.status(404).json({ error: 'File non trovato' });
    }
  });

  app.get('/api/movements/export/csv', (req, res) => {
    try {
      const movements = db.prepare(`
        SELECT m.id, a.nome as articolo_nome, a.codice as articolo_codice, m.fase, m.tipo, m.quantita, m.operatore, m.cliente, m.commessa, m.timestamp
        FROM movements_log m 
        JOIN articles a ON m.articolo_id = a.id
        ORDER BY m.timestamp DESC
      `).all();

      const headers = ['ID', 'Articolo', 'Codice', 'Fase', 'Tipo', 'Quantita', 'Operatore', 'Cliente', 'Commessa', 'Data'];
      const rows = movements.map((m: any) => [
        m.id,
        `"${(m.articolo_nome || '').replace(/"/g, '""')}"`,
        `"${(m.articolo_codice || '').replace(/"/g, '""')}"`,
        `"${(m.fase || '').replace(/"/g, '""')}"`,
        `"${(m.tipo || '').replace(/"/g, '""')}"`,
        m.quantita,
        `"${(m.operatore || '').replace(/"/g, '""')}"`,
        `"${(m.cliente || '').replace(/"/g, '""')}"`,
        `"${(m.commessa || '').replace(/"/g, '""')}"`,
        `"${(m.timestamp || '').replace(/"/g, '""')}"`
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="movimenti_export.csv"');
      res.send(csvContent);
    } catch (error: any) {
      console.error('Error exporting movements:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/backup/download', (req, res) => {
    try {
      const backupPath = path.join(process.cwd(), 'backup.sqlite');
      // Create a consistent backup of the database
      db.exec(`VACUUM INTO '${backupPath}'`);
      
      res.download(backupPath, `dashboard_auger_backup_${new Date().toISOString().split('T')[0]}.sqlite`, (err) => {
        if (err) {
          console.error("Error downloading backup:", err);
        }
        // Clean up backup file after download
        if (existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      });
    } catch (error: any) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/backup/upload', upload.single('db'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }
      
      const dbPath = path.join(process.cwd(), 'database.sqlite');
      
      // Close DB connection
      db.close();
      
      // Delete WAL and SHM files if they exist
      if (existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
      if (existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      
      // Replace database file
      fs.copyFileSync(req.file.path, dbPath);
      fs.unlinkSync(req.file.path);
      
      res.json({ success: true, message: 'Database ripristinato con successo. Il server si sta riavviando...' });
      
      // Restart process to reload DB
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/movements', (req, res) => {
    const { articolo_id, fase, tipo, quantita, operatore = '' } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty < 0) throw new Error("Quantità non valida");

      const transaction = db.transaction(() => {
        // Fetch current processes
        const procRow = db.prepare(`SELECT * FROM processes WHERE articolo_id = ?`).get(articolo_id) as any;
        if (!procRow) throw new Error("Processi non trovati per questo articolo");
        
        // Fetch current article
        const artRow = db.prepare(`SELECT * FROM articles WHERE id = ?`).get(articolo_id) as any;
        if (!artRow) throw new Error("Articolo non trovato");

        let { taglio, piega, saldatura, verniciatura } = procRow;
        let { verniciati, impegni_clienti } = artRow;

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
          return 'Senza Categoria';
        };

        const category = getCategory(artRow.nome, artRow.codice);
        const catLower = category.toLowerCase();
        const skipPiega = catLower.includes('porte') || catLower.includes('retri') || catLower.includes('laterali') || catLower.includes('tetti');

        let prevFase = null;
        if (tipo === 'carico') {
            if (fase === 'taglio') {
                taglio += qty;
            } else if (fase === 'piega') {
                piega += qty;
                taglio -= qty; // Scala dal taglio (può andare in negativo)
                prevFase = 'taglio';
            } else if (fase === 'saldatura') {
                saldatura += qty;
                if (skipPiega) {
                    taglio -= qty; // Scala dal taglio
                    prevFase = 'taglio';
                } else {
                    piega -= qty; // Scala dalla piega
                    prevFase = 'piega';
                }
            } else if (fase === 'verniciatura') {
                verniciatura += qty;
                verniciati += qty;
                saldatura -= qty; // Scala dalla saldatura
                prevFase = 'saldatura';
            } else if (fase === 'impegni') {
                impegni_clienti += qty;
            }
        } else if (tipo === 'scarico') {
            if (fase === 'taglio') taglio -= qty;
            else if (fase === 'piega') piega -= qty;
            else if (fase === 'saldatura') saldatura -= qty;
            else if (fase === 'verniciatura') {
                verniciatura -= qty;
                verniciati -= qty;
            }
            else if (fase === 'impegni') impegni_clienti -= qty;
        } else if (tipo === 'rettifica') {
            if (fase === 'taglio') taglio = qty;
            else if (fase === 'piega') piega = qty;
            else if (fase === 'saldatura') saldatura = qty;
            else if (fase === 'verniciatura') {
                verniciatura = qty;
                verniciati = qty;
            }
            else if (fase === 'impegni') impegni_clienti = qty;
        }

        // Update processes
        db.prepare(`UPDATE processes SET taglio = ?, piega = ?, saldatura = ?, verniciatura = ? WHERE articolo_id = ?`)
          .run(taglio, piega, saldatura, verniciatura, articolo_id);
        
        // Update articles
        db.prepare(`UPDATE articles SET verniciati = ?, impegni_clienti = ?, piega = ? WHERE id = ?`)
          .run(verniciati, impegni_clienti, piega, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(articolo_id, fase, tipo, qty, operatore, req.body.cliente || null, req.body.commessa || null);

        // Log automatic scarico from previous phase if applicable
        if (prevFase) {
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(articolo_id, prevFase, 'scarico', qty, operatore, req.body.cliente || null, req.body.commessa || null);
        }
      });
      
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Commitments (Impegni)
  app.get('/api/commitments', (req, res) => {
    try {
      const commitments = db.prepare(`
        SELECT c.*, a.nome as articolo_nome, a.codice as articolo_codice 
        FROM commitments c 
        JOIN articles a ON c.articolo_id = a.id
        ORDER BY CASE WHEN c.priorita = 0 THEN 999999 ELSE c.priorita END ASC, c.data_inserimento DESC
      `).all();
      res.json(commitments);
    } catch (error: any) {
      console.error('Error fetching commitments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/commitments', async (req, res) => {
    const { articolo_id, cliente, commessa, quantita, priorita = 0, fase_produzione = 'Generico', operatore = '', note = '', stato_lavorazione = 'Pianificato' } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantità non valida");

      let newCommitmentId: number | bigint = 0;
      const transaction = db.transaction(() => {
        // Create commitment
        const stmt = db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, priorita, fase_produzione, operatore, note, stato_lavorazione) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const info = stmt.run(articolo_id, cliente, commessa, qty, priorita, fase_produzione, operatore, note, stato_lavorazione);
        newCommitmentId = info.lastInsertRowid;
        
        // Update total impegni in articles
        db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qty, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_creazione', 'carico', qty, operatore, cliente, commessa);

        return newCommitmentId;
      });

      const id = transaction();
      
      res.json({ id, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/batch', async (req, res) => {
    const { items, cliente, commessa, priorita = 0, fase_produzione = 'Generico', operatore = '', note = '', stato_lavorazione = 'Pianificato' } = req.body;
    try {
      if (!Array.isArray(items) || items.length === 0) throw new Error("Nessun articolo fornito");

      const transaction = db.transaction(() => {
        for (const item of items) {
          let { articolo_id, codice_articolo, quantita } = item;
          const qty = parseInt(quantita, 10);
          if (isNaN(qty) || qty <= 0) continue;

          if (!articolo_id && codice_articolo) {
            // Find if article exists
            const existing = db.prepare('SELECT id FROM articles WHERE codice = ?').get(codice_articolo) as any;
            if (existing) {
              articolo_id = existing.id;
            } else {
              // Create new article
              const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, piega) VALUES (?, ?, 0, 0, 0)');
              const info = stmt.run(codice_articolo, codice_articolo);
              articolo_id = info.lastInsertRowid;
              
              // Initialize processes
              db.prepare('INSERT INTO processes (articolo_id, taglio, piega, saldatura, verniciatura) VALUES (?, 0, 0, 0, 0)')
                .run(articolo_id);
            }
          }

          if (!articolo_id) continue;

          // Create commitment
          db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, priorita, fase_produzione, operatore, note, stato_lavorazione) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(articolo_id, cliente, commessa, qty, priorita, fase_produzione, operatore, note, stato_lavorazione);
          
          // Update total impegni in articles
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qty, articolo_id);

          // Log the movement
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(articolo_id, 'impegni_creazione', 'carico', qty, operatore, cliente, commessa);
        }
      });

      transaction();
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/commitments/:id', async (req, res) => {
    const { id } = req.params;
    const { cliente, commessa, quantita, priorita, fase_produzione, operatore, note, stato_lavorazione } = req.body;
    try {
      const transaction = db.transaction(() => {
        const oldCommitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!oldCommitment) throw new Error("Impegno non trovato");

        let newQty = oldCommitment.quantita;
        if (quantita !== undefined) {
          const parsedQty = parseInt(quantita, 10);
          if (isNaN(parsedQty) || parsedQty <= 0) throw new Error("Quantità non valida");
          newQty = parsedQty;
        }

        const qtyDiff = newQty - oldCommitment.quantita;

        db.prepare(`
          UPDATE commitments 
          SET cliente = ?, commessa = ?, quantita = ?, priorita = ?, fase_produzione = ?, operatore = ?, note = ?, stato_lavorazione = ?, timestamp_modifica = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(cliente || oldCommitment.cliente, commessa || oldCommitment.commessa, newQty, priorita ?? oldCommitment.priorita, fase_produzione || oldCommitment.fase_produzione, operatore || oldCommitment.operatore, note || oldCommitment.note, stato_lavorazione || oldCommitment.stato_lavorazione, id);

        if (qtyDiff !== 0 && oldCommitment.stato_lavorazione !== 'Completato') {
          db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti + ?) WHERE id = ?`).run(qtyDiff, oldCommitment.articolo_id);
        }
      });

      transaction();

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/commitments/:id', async (req, res) => {
    const { id } = req.params;
    try {
      let fullCommitment: any;
      const transaction = db.transaction(() => {
        fullCommitment = db.prepare(`
          SELECT c.*, a.nome as articolo_nome 
          FROM commitments c 
          JOIN articles a ON c.articolo_id = a.id 
          WHERE c.id = ?
        `).get(id);

        if (!fullCommitment) throw new Error("Impegno non trovato");

        if (fullCommitment.stato_lavorazione !== 'Completato') {
          db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`).run(fullCommitment.quantita, fullCommitment.articolo_id);
        }
        db.prepare('DELETE FROM commitments WHERE id = ?').run(id);
      });

      transaction();

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/reorder', (req, res) => {
    const { orders } = req.body; // Array of { id, priority }
    try {
      if (!Array.isArray(orders)) throw new Error("Dati non validi");

      const transaction = db.transaction(() => {
        const stmt = db.prepare('UPDATE commitments SET priorita = ? WHERE id = ?');
        for (const order of orders) {
          stmt.run(order.priority, order.id);
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/commitments/by-commessa/:commessa', (req, res) => {
    const { commessa } = req.params;
    const commitments = db.prepare(`
      SELECT c.*, a.nome as articolo_nome, a.codice as articolo_codice, a.verniciati, p.piega
      FROM commitments c 
      JOIN articles a ON c.articolo_id = a.id
      LEFT JOIN processes p ON a.id = p.articolo_id
      WHERE c.commessa = ?
      ORDER BY c.data_inserimento DESC
    `).all(commessa);
    res.json(commitments);
  });

  app.post('/api/commitments/fulfill-by-commessa', async (req, res) => {
    const { commessa, ids } = req.body;
    try {
      let deletedCommitments: any[] = [];
      const transaction = db.transaction(() => {
        let commitments;
        if (ids && Array.isArray(ids)) {
          if (ids.length === 0) {
            commitments = [];
          } else {
            commitments = db.prepare('SELECT * FROM commitments WHERE id IN (' + ids.map(() => '?').join(',') + ')').all(...ids) as any[];
          }
        } else {
          commitments = db.prepare('SELECT * FROM commitments WHERE commessa = ?').all(commessa) as any[];
        }
        
        if (commitments.length === 0) {
          throw new Error("Nessun impegno trovato");
        }

        for (const commitment of commitments) {
          if (commitment.stato_lavorazione === 'Completato') continue;

          const qty = commitment.quantita;
          const articolo_id = commitment.articolo_id;

          const article = db.prepare('SELECT nome, verniciati FROM articles WHERE id = ?').get(articolo_id) as any;
          const isPiastra = article && article.nome.toLowerCase().includes('piastra');
          const process = db.prepare('SELECT piega, verniciatura FROM processes WHERE articolo_id = ?').get(articolo_id) as any;

          if (isPiastra) {
            const piegaDisp = process ? process.piega : 0;
            if (piegaDisp < qty) {
              throw new Error(`Impossibile evadere commessa: le piastre dell'articolo ${article.nome} non sono sufficientemente piegate (Disponibili: ${piegaDisp}, Richieste: ${qty})`);
            }
            // Deduct from impegni_clienti and piega in articles
            db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti - ?), piega = MAX(0, piega - ?) WHERE id = ?`)
              .run(qty, qty, articolo_id);

            // Deduct from piega in processes
            db.prepare(`UPDATE processes SET piega = MAX(0, piega - ?) WHERE articolo_id = ?`)
              .run(qty, articolo_id);
          } else {
            const verniciatiDisp = article ? article.verniciati : 0;
            if (verniciatiDisp < qty) {
              throw new Error(`Impossibile evadere commessa: i pezzi dell'articolo ${article.nome} non sono sufficientemente verniciati (Disponibili: ${verniciatiDisp}, Richiesti: ${qty})`);
            }
            // Deduct from verniciati and impegni_clienti in articles
            db.prepare(`UPDATE articles SET verniciati = MAX(0, verniciati - ?), impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`)
              .run(qty, qty, articolo_id);

            // Deduct from verniciatura in processes
            db.prepare(`UPDATE processes SET verniciatura = MAX(0, verniciatura - ?) WHERE articolo_id = ?`)
              .run(qty, articolo_id);
          }

          // Update the commitment status to Completato instead of deleting
          db.prepare("UPDATE commitments SET stato_lavorazione = 'Completato', timestamp_modifica = CURRENT_TIMESTAMP WHERE id = ?").run(commitment.id);

          // Log the movement
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(articolo_id, 'impegni_evasione_commessa', 'evasione', qty, 'System', commitment.cliente, commitment.commessa);
            
          deletedCommitments.push({ ...commitment, articolo_nome: article.nome });
        }
      });

      transaction();
      
      res.json({ success: true, message: "Commessa evasa con successo" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/:id/fulfill', async (req, res) => {
    const { id } = req.params;
    try {
      let fullCommitment: any;
      const transaction = db.transaction(() => {
        const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!commitment) throw new Error("Impegno non trovato");
        if (commitment.stato_lavorazione === 'Completato') throw new Error("Impegno già evaso");

        const qty = commitment.quantita;
        const articolo_id = commitment.articolo_id;

        const article = db.prepare('SELECT nome, verniciati FROM articles WHERE id = ?').get(articolo_id) as any;
        const isPiastra = article && article.nome.toLowerCase().includes('piastra');
        const process = db.prepare('SELECT piega, verniciatura FROM processes WHERE articolo_id = ?').get(articolo_id) as any;

        if (isPiastra) {
          const piegaDisp = process ? process.piega : 0;
          if (piegaDisp < qty) {
            throw new Error(`Impossibile evadere: le piastre non sono sufficientemente piegate (Disponibili: ${piegaDisp}, Richieste: ${qty})`);
          }
          // Deduct from impegni_clienti and piega in articles
          db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti - ?), piega = MAX(0, piega - ?) WHERE id = ?`)
            .run(qty, qty, articolo_id);

          // Deduct from piega in processes
          db.prepare(`UPDATE processes SET piega = MAX(0, piega - ?) WHERE articolo_id = ?`)
            .run(qty, articolo_id);
        } else {
          const verniciatiDisp = article ? article.verniciati : 0;
          if (verniciatiDisp < qty) {
            throw new Error(`Impossibile evadere: i pezzi non sono sufficientemente verniciati (Disponibili: ${verniciatiDisp}, Richiesti: ${qty})`);
          }
          // Deduct from verniciati and impegni_clienti in articles
          db.prepare(`UPDATE articles SET verniciati = MAX(0, verniciati - ?), impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`)
            .run(qty, qty, articolo_id);

          // Deduct from verniciatura in processes
          db.prepare(`UPDATE processes SET verniciatura = MAX(0, verniciatura - ?) WHERE articolo_id = ?`)
            .run(qty, articolo_id);
        }

        // Update the commitment status to Completato instead of deleting
        db.prepare("UPDATE commitments SET stato_lavorazione = 'Completato', timestamp_modifica = CURRENT_TIMESTAMP WHERE id = ?").run(id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_evasione', 'evasione', qty, 'System', commitment.cliente, commitment.commessa);
          
        fullCommitment = { ...commitment, articolo_nome: article.nome };
      });

      transaction();
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/:id/ship', async (req, res) => {
    const { id } = req.params;
    const { operatore } = req.body || {};
    try {
      const transaction = db.transaction(() => {
        const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!commitment) throw new Error("Impegno non trovato");

        // If it wasn't completed yet, we need to subtract from impegni_clienti
        if (commitment.stato_lavorazione !== 'Completato') {
          db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`).run(commitment.quantita, commitment.articolo_id);
        }

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(commitment.articolo_id, 'spedizione commessa', 'Evasione Commessa', commitment.quantita, operatore || 'System', commitment.cliente, commitment.commessa);

        db.prepare('DELETE FROM commitments WHERE id = ?').run(id);
      });

      transaction();
      
      res.json({ success: true, message: "Commessa spedita con successo" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const subscription = req.body.subscription;
    const user = req.body.user;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    try {
      db.prepare(`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, user) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET 
          p256dh = excluded.p256dh,
          auth = excluded.auth,
          user = excluded.user
      `).run(
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        user || null
      );
      res.status(201).json({ success: true });
    } catch (error: any) {
      console.error('Error saving subscription:', error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    
    try {
      db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const connectedUsers = new Map<WebSocket, { username: string }>();

  function broadcastUsers() {
    const userMap = new Map<string, { username: string }>();
    
    for (const session of connectedUsers.values()) {
      if (!userMap.has(session.username)) {
        userMap.set(session.username, { username: session.username });
      }
    }
    
    const users = Array.from(userMap.values());
    const message = JSON.stringify({ type: 'users', users });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  wss.on('connection', (ws, req) => {
    (ws as any).isAlive = true;

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'login' && data.username) {
          connectedUsers.set(ws, { username: data.username });
          broadcastUsers();
        } else if (data.type === 'logout') {
          connectedUsers.delete(ws);
          broadcastUsers();
        } else if (data.type === 'chat_message') {
          const session = connectedUsers.get(ws);
          if (session && CHAT_AUTHORIZED_USERS.includes(session.username)) {
            // The client sends a flat object (sender, text, timestamp)
            // We wrap it in a 'message' property for the broadcast to match ErrorReportChat expectation
            const messageData = {
              sender: data.sender || session.username,
              text: data.text,
              timestamp: data.timestamp || new Date().toISOString(),
              id: data.id // might be undefined if sent via WS directly, but usually it's sent via API
            };
            
            const broadcastMsg = JSON.stringify({ type: 'chat_message', message: messageData });
            wss.clients.forEach(client => {
              const clientSession = connectedUsers.get(client);
              if (client !== ws && client.readyState === WebSocket.OPEN && clientSession && CHAT_AUTHORIZED_USERS.includes(clientSession.username)) {
                client.send(broadcastMsg);
              }
            });
          }
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    });

    ws.on('close', () => {
      connectedUsers.delete(ws);
      broadcastUsers();
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if ((ws as any).isAlive === false) {
        connectedUsers.delete(ws);
        broadcastUsers();
        return ws.terminate();
      }

      (ws as any).isAlive = false;
      ws.ping();
    });
  }, 10000); // Ping every 10 seconds

  wss.on('close', () => {
    clearInterval(interval);
  });

  // Version checking and push notification logic
  const checkVersionAndNotify = () => {
    const versionPath = path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/version.json' : 'public/version.json');
    const lastVersionPath = path.join(process.cwd(), 'last_version.txt');

    if (existsSync(versionPath)) {
      try {
        const versionData = JSON.parse(readFileSync(versionPath, 'utf-8'));
        const currentVersion = versionData.version;
        
        let lastVersion = null;
        if (existsSync(lastVersionPath)) {
          lastVersion = readFileSync(lastVersionPath, 'utf-8').trim();
        }

        if (currentVersion && lastVersion !== currentVersion) {
          console.log(`New version detected: ${currentVersion} (was ${lastVersion || 'unknown'})`);
          writeFileSync(lastVersionPath, currentVersion);

          // Only send notifications if it's not the first run
          if (lastVersion !== null) {
            const subscriptions = db.prepare('SELECT * FROM push_subscriptions').all() as any[];
            console.log(`Sending push notifications to ${subscriptions.length} subscribers`);
            
            const payload = JSON.stringify({
              title: 'AGGIORNAMENTO APP DISPONIBILE',
              body: 'È disponibile una nuova versione dell\'applicazione. Clicca per aggiornare.',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              data: { version: currentVersion }
            });

            subscriptions.forEach(sub => {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              };

              webpush.sendNotification(pushSubscription, payload).catch(error => {
                console.error('Error sending push notification:', error);
                if (error.statusCode === 410 || error.statusCode === 404) {
                  // Subscription has expired or is no longer valid
                  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
                }
              });
            });
          }
        }
      } catch (error) {
        console.error('Error checking version:', error);
      }
    }
  };

  // Check version on startup
  checkVersionAndNotify();
  // And check periodically (e.g., every minute)
  setInterval(checkVersionAndNotify, 60000);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Server is ready to receive requests.');
  });
}

startServer();

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

// --- Automatic Archiving for Fase Taglio ---
// Every day at 23:00 (Europe/Rome time), archive rows where fatto=1 and stampato=1
let lastFaseTaglioArchiveDate = '';

function scheduleFaseTaglioArchiving() {
  setInterval(() => {
    try {
      const now = new Date();
      // Get current date and time in Europe/Rome
      const romeParts = new Intl.DateTimeFormat('it-IT', {
        timeZone: 'Europe/Rome',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).formatToParts(now);
      
      const year = romeParts.find(p => p.type === 'year').value;
      const month = romeParts.find(p => p.type === 'month').value;
      const day = romeParts.find(p => p.type === 'day').value;
      const hour = parseInt(romeParts.find(p => p.type === 'hour').value);
      const minute = parseInt(romeParts.find(p => p.type === 'minute').value);
      
      const currentDateStr = `${year}-${month}-${day}`;

      // Run at 23:00 and only once per day
      if (hour === 23 && minute === 0 && lastFaseTaglioArchiveDate !== currentDateStr) {
        lastFaseTaglioArchiveDate = currentDateStr;
        console.log(`[${new Date().toISOString()}] Running automatic archiving for Fase Taglio...`);
        
        const toArchive = db.prepare('SELECT * FROM fase_taglio WHERE fatto = 1 AND stampato = 1').all() as any[];
        
        if (toArchive.length > 0) {
          const insertStmt = db.prepare('INSERT INTO archivio_stampe (lavorazione_per, articolo, quantita, data, odl, commessa, macchina) VALUES (?, ?, ?, ?, ?, ?, ?)');
          const deleteStmt = db.prepare('DELETE FROM fase_taglio WHERE id = ?');
          
          const archiveTransaction = db.transaction((rows) => {
            for (const row of rows) {
              insertStmt.run(row.lavorazione_per, row.articolo, row.quantita, row.data, row.odl, row.commessa, row.macchina);
              deleteStmt.run(row.id);
            }
          });
          
          archiveTransaction(toArchive);
          console.log(`[${new Date().toISOString()}] Successfully archived ${toArchive.length} rows from Fase Taglio.`);
        } else {
          console.log(`[${new Date().toISOString()}] No rows to archive for Fase Taglio.`);
        }
      }
    } catch (error) {
      console.error('Error during automatic archiving for Fase Taglio:', error);
    }
  }, 60000); // Check every minute
}

scheduleFaseTaglioArchiving();

console.log('Starting server...');

async function startServer() {
  console.log('Initializing express app...');
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  console.log('Express middleware configured.');

  // Health check endpoint for Cloud Run
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // --- API Routes ---

  const CHAT_AUTHORIZED_USERS = ['LucaTurati', 'TahaJbala', 'TahaDev'];

  // --- API Traverse Inventory ---
  app.get('/api/traverse', (req, res) => {
    try {
      const traverse = db.prepare('SELECT * FROM traverse_inventory').all();
      res.json(traverse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/traverse/carico', (req, res) => {
    const { tipo, misura, quantita } = req.body;
    console.log('Carico traverse:', { tipo, misura, quantita });
    try {
      const stmt = db.prepare('INSERT INTO traverse_inventory (tipo, misura, quantita) VALUES (?, ?, ?) ON CONFLICT(tipo, misura) DO UPDATE SET quantita = quantita + ?');
      stmt.run(tipo, misura, quantita, quantita);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Errore carico traverse:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/traverse/:id', (req, res) => {
    const { id } = req.params;
    const { tipo, misura, quantita } = req.body;
    try {
      db.prepare('UPDATE traverse_inventory SET tipo = ?, misura = ?, quantita = ? WHERE id = ?').run(tipo, misura, quantita, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/traverse/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM traverse_inventory WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- AGR Requirements ---
  app.get('/api/agr_requirements', (req, res) => {
    try {
      const reqs = db.prepare('SELECT * FROM agr_requirements').all();
      res.json(reqs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Sincronizzazione Saldatura ---
  app.post('/api/agr/saldatura', (req, res) => {
    const { agr_codice, quantita } = req.body;
    console.log('Saldatura richiesta:', { agr_codice, quantita });
    try {
      const transaction = db.transaction(() => {
        const match = agr_codice.match(/^AGR(\d{2})(\d{2})$/);
        if (!match) throw new Error("Codice struttura non valido");

        const w = parseInt(match[1]) * 100;
        const h = parseInt(match[2]) * 100;

        // 2. Check traverse availability
        const needed = [
          { tipo: 'forata', misura: w, q: quantita * 2 },
          { tipo: 'cieca', misura: h, q: quantita * 2 },
          { tipo: 'tetto1', misura: w, q: quantita * 2 },
          { tipo: 'tetto2', misura: h, q: quantita * 2 }
        ];

        for (const item of needed) {
          const inv = db.prepare('SELECT quantita FROM traverse_inventory WHERE tipo = ? AND misura = ?').get(item.tipo, item.misura) as any;
          if (!inv || inv.quantita < item.q) throw new Error(`Traverse insufficienti: ${item.tipo} ${item.misura}`);
        }

        // 3. Scarico traverse
        for (const item of needed) {
          db.prepare('UPDATE traverse_inventory SET quantita = quantita - ? WHERE tipo = ? AND misura = ?').run(item.q, item.tipo, item.misura);
        }

        // 4. Aggiorna stato struttura
        db.prepare('INSERT INTO casse_complete_at (articolo, totale) VALUES (?, ?) ON CONFLICT(articolo) DO UPDATE SET totale = totale + ?').run(agr_codice, quantita, quantita);
      });

      transaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Errore saldatura:', error);
      res.status(400).json({ error: error.message });
    }
  });

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
    
    const users = [
      { username: "LucaTurati", password: "Auger2014", role: "admin" },
      { username: "AdeleTurati", password: "Auger2014", role: "admin" },
      { username: "RobertoBonalumi", password: "Auger2014", role: "admin" },
      { username: "SamantaLimonta", password: "Auger2014", role: "user" },
      { username: "TahaJbala", password: "Auger2014", role: "user" },
      { username: "TahaDev", password: "AugerDev2026", role: "developer" },
      { username: "RidaTecnico", password: "Auger2014", role: "taglio_only" },
      { username: "ElenaTurati", password: "Auger2014", role: "elena_view" },
      { username: "Andrea", password: "Auger2014", role: "macchina_5000" },
      { username: "Osvaldo", password: "Auger2014", role: "taglio_only" }
    ];
    
    // Case-insensitive check
    const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (!matchedUser) {
      return res.status(401).json({ error: 'Utente non autorizzato' });
    }
    
    if (password !== matchedUser.password) {
      return res.status(401).json({ error: 'Password errata' });
    }

    res.json({ success: true, username: matchedUser.username, role: matchedUser.role });
  });

  // Macchina 5000 CRUD
  app.get('/api/macchina-5000', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM macchina_5000 ORDER BY created_at DESC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/macchina-5000', (req, res) => {
    const { data, articolo, quantita, preparazione = 0, inizio = null, fine = null, totale_tempo = null, odl = null, stato = 'da tagliare', operatore = null, cliente = null, commessa = null } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO macchina_5000 (data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa);
      res.json({ id: info.lastInsertRowid, data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/macchina-5000/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      // First get the existing record
      const existing = db.prepare('SELECT * FROM macchina_5000 WHERE id = ?').get(id) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Record non trovato' });
      }

      // Merge updates with existing data
      const data = updates.data !== undefined ? updates.data : existing.data;
      const articolo = updates.articolo !== undefined ? updates.articolo : existing.articolo;
      const quantita = updates.quantita !== undefined ? updates.quantita : existing.quantita;
      const preparazione = updates.preparazione !== undefined ? updates.preparazione : existing.preparazione;
      const inizio = updates.inizio !== undefined ? updates.inizio : existing.inizio;
      const fine = updates.fine !== undefined ? updates.fine : existing.fine;
      const totale_tempo = updates.totale_tempo !== undefined ? updates.totale_tempo : existing.totale_tempo;
      const odl = updates.odl !== undefined ? updates.odl : existing.odl;
      const stato = updates.stato !== undefined ? updates.stato : existing.stato;
      const operatore = updates.operatore !== undefined ? updates.operatore : existing.operatore;

      const cliente = updates.cliente !== undefined ? updates.cliente : existing.cliente;
      const commessa = updates.commessa !== undefined ? updates.commessa : existing.commessa;
      const pausa = updates.pausa !== undefined ? updates.pausa : existing.pausa;
      const inizio2 = updates.inizio2 !== undefined ? updates.inizio2 : existing.inizio2;

      const stmt = db.prepare(`
        UPDATE macchina_5000 
        SET data = ?, articolo = ?, quantita = ?, preparazione = ?, inizio = ?, fine = ?, totale_tempo = ?, odl = ?, stato = ?, operatore = ?, cliente = ?, commessa = ?, pausa = ?, inizio2 = ?
        WHERE id = ?
      `);
      stmt.run(data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa, pausa, inizio2, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/macchina-5000/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM macchina_5000 WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Taglio Laser
  app.get('/api/taglio-laser', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM taglio_laser ORDER BY created_at DESC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/taglio-laser', (req, res) => {
    const { data, articolo, quantita, preparazione = 0, inizio = null, fine = null, totale_tempo = null, odl = null, stato = 'da tagliare', operatore = null, cliente = null, commessa = null } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO taglio_laser (data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa);
      res.json({ id: info.lastInsertRowid, data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/taglio-laser/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      const existing = db.prepare('SELECT * FROM taglio_laser WHERE id = ?').get(id) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Record non trovato' });
      }

      const data = updates.data !== undefined ? updates.data : existing.data;
      const articolo = updates.articolo !== undefined ? updates.articolo : existing.articolo;
      const quantita = updates.quantita !== undefined ? updates.quantita : existing.quantita;
      const preparazione = updates.preparazione !== undefined ? updates.preparazione : existing.preparazione;
      const inizio = updates.inizio !== undefined ? updates.inizio : existing.inizio;
      const fine = updates.fine !== undefined ? updates.fine : existing.fine;
      const totale_tempo = updates.totale_tempo !== undefined ? updates.totale_tempo : existing.totale_tempo;
      const odl = updates.odl !== undefined ? updates.odl : existing.odl;
      const stato = updates.stato !== undefined ? updates.stato : existing.stato;
      const operatore = updates.operatore !== undefined ? updates.operatore : existing.operatore;
      const cliente = updates.cliente !== undefined ? updates.cliente : existing.cliente;
      const commessa = updates.commessa !== undefined ? updates.commessa : existing.commessa;
      const pausa = updates.pausa !== undefined ? updates.pausa : existing.pausa;
      const inizio2 = updates.inizio2 !== undefined ? updates.inizio2 : existing.inizio2;

      const stmt = db.prepare(`
        UPDATE taglio_laser 
        SET data = ?, articolo = ?, quantita = ?, preparazione = ?, inizio = ?, fine = ?, totale_tempo = ?, odl = ?, stato = ?, operatore = ?, cliente = ?, commessa = ?, pausa = ?, inizio2 = ?
        WHERE id = ?
      `);
      stmt.run(data, articolo, quantita, preparazione, inizio, fine, totale_tempo, odl, stato, operatore, cliente, commessa, pausa, inizio2, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/taglio-laser/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM taglio_laser WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Movimenti C. Gialla
  app.get('/api/movimenti-c-gialla', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM movimenti_c_gialla ORDER BY data_reg DESC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/movimenti-c-gialla', (req, res) => {
    const { articolo_spc, fase, quantita, cliente_commessa, operatore, tempo_totale, data_reg, quantita_lanciata } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO movimenti_c_gialla (articolo_spc, fase, quantita, cliente_commessa, operatore, tempo_totale, data_reg, quantita_lanciata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(articolo_spc, fase, quantita, cliente_commessa, operatore, tempo_totale, data_reg || new Date().toISOString(), quantita_lanciata || null);
      res.json({ id: info.lastInsertRowid, articolo_spc, fase, quantita, cliente_commessa, operatore, tempo_totale, quantita_lanciata });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Fase Taglio CRUD
  app.get('/api/fase-taglio', (req, res) => {
    try {
      console.log(`[${new Date().toISOString()}] GET /api/fase-taglio - Request received`);
      const rows = db.prepare('SELECT * FROM fase_taglio ORDER BY created_at DESC').all();
      console.log(`[${new Date().toISOString()}] GET /api/fase-taglio - Fetched ${rows.length} rows`);
      res.json(rows);
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] GET /api/fase-taglio - Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/fase-saldatura', (req, res) => {
    try {
      console.log(`[${new Date().toISOString()}] GET /api/fase-saldatura - Request received`);
      const rows = db.prepare('SELECT * FROM fase_saldatura ORDER BY created_at DESC').all();
      console.log(`[${new Date().toISOString()}] GET /api/fase-saldatura - Fetched ${rows.length} rows`);
      res.json(rows);
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] GET /api/fase-saldatura - Error:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/fase-taglio', (req, res) => {
    const { lavorazione_per, articolo, quantita, data, fatto = 0, stampato = 0, odl = '', commessa = '', macchina = 'Macchina 5000' } = req.body;
    try {
      console.log(`[${new Date().toISOString()}] POST /api/fase-taglio - Data:`, { lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina });
      const stmt = db.prepare('INSERT INTO fase_taglio (lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina);
      console.log(`[${new Date().toISOString()}] POST /api/fase-taglio - Success, ID:`, info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid, lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina });
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] POST /api/fase-taglio - Error:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/fase-saldatura', (req, res) => {
    const { lavorazione_per, articolo, quantita, data, fatto = 0, stampato = 0, odl = '', commessa = '', macchina = 'Reparto Saldatura' } = req.body;
    try {
      console.log(`[${new Date().toISOString()}] POST /api/fase-saldatura - Data:`, { lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina });
      const stmt = db.prepare('INSERT INTO fase_saldatura (lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina);
      console.log(`[${new Date().toISOString()}] POST /api/fase-saldatura - Success, ID:`, info.lastInsertRowid);
      res.json({ id: info.lastInsertRowid, lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina });
    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] POST /api/fase-saldatura - Error:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/fase-taglio/:id', (req, res) => {
    const { id } = req.params;
    const { lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina } = req.body;
    try {
      const stmt = db.prepare('UPDATE fase_taglio SET lavorazione_per = ?, articolo = ?, quantita = ?, data = ?, fatto = ?, stampato = ?, odl = ?, commessa = ?, macchina = ? WHERE id = ?');
      stmt.run(lavorazione_per, articolo, quantita, data, fatto, stampato, odl, commessa, macchina, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/fase-taglio/:id', (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare('DELETE FROM fase_taglio WHERE id = ?');
      stmt.run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/archivio-stampe', (req, res) => {
    try {
      const rows = db.prepare('SELECT *, timestamp_stampa as data_archiviazione FROM archivio_stampe ORDER BY timestamp_stampa DESC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/archivio-stampe', (req, res) => {
    const { lavorazione_per, articolo, quantita, data, odl = '', commessa = '', macchina = 'Macchina 5000' } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO archivio_stampe (lavorazione_per, articolo, quantita, data, odl, commessa, macchina) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(lavorazione_per, articolo, quantita, data, odl, commessa, macchina);
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/programmi-eseguiti', (req, res) => {
    try {
      const rows = db.prepare('SELECT *, timestamp_esecuzione as data_archiviazione FROM programmi_eseguiti ORDER BY timestamp_esecuzione DESC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/programmi-eseguiti', (req, res) => {
    const { lavorazione_per, articolo, quantita, data, odl = '', commessa = '' } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO programmi_eseguiti (lavorazione_per, articolo, quantita, data, odl, commessa) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(lavorazione_per, articolo, quantita, data, odl, commessa);
      res.json({ id: info.lastInsertRowid, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Articles CRUD
  app.get('/api/articles', (req, res) => {
    console.log('GET /api/articles called');
    try {
      const articles = db.prepare(`
        SELECT a.*, p.piega 
        FROM articles a 
        LEFT JOIN processes p ON a.id = p.articolo_id
        GROUP BY a.id
        ORDER BY a.codice ASC
      `).all();
      console.log('Articles fetched:', articles.length);
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
      const prezzo_lamiera = req.body.prezzo_lamiera !== undefined ? req.body.prezzo_lamiera : existing.prezzo_lamiera;
      const prezzo_taglio = req.body.prezzo_taglio !== undefined ? req.body.prezzo_taglio : existing.prezzo_taglio;
      const prezzo_piega = req.body.prezzo_piega !== undefined ? req.body.prezzo_piega : existing.prezzo_piega;
      const prezzo_verniciatura = req.body.prezzo_verniciatura !== undefined ? req.body.prezzo_verniciatura : existing.prezzo_verniciatura;
      const prezzo_gommatura = req.body.prezzo_gommatura !== undefined ? req.body.prezzo_gommatura : existing.prezzo_gommatura;
      const prezzo_montaggio = req.body.prezzo_montaggio !== undefined ? req.body.prezzo_montaggio : existing.prezzo_montaggio;
      const prezzo_vendita = req.body.prezzo_vendita !== undefined ? req.body.prezzo_vendita : existing.prezzo_vendita;

      const stmt = db.prepare('UPDATE articles SET nome = ?, codice = ?, verniciati = ?, impegni_clienti = ?, piega = ?, prezzo = ?, scorta = ?, prezzo_lamiera = ?, prezzo_taglio = ?, prezzo_piega = ?, prezzo_verniciatura = ?, prezzo_gommatura = ?, prezzo_montaggio = ?, prezzo_vendita = ? WHERE id = ?');
      stmt.run(nome, codice, verniciati, impegni_clienti, piega, prezzo, scorta, prezzo_lamiera, prezzo_taglio, prezzo_piega, prezzo_verniciatura, prezzo_gommatura, prezzo_montaggio, prezzo_vendita, id);
      
      // Also update processes.piega to keep them in sync
      db.prepare('UPDATE processes SET piega = ? WHERE articolo_id = ?').run(piega, id);
      
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

  // --- Casse AT CRUD ---
  app.get('/api/casse-at/piastre', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM piastre_at ORDER BY id ASC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/casse-at/piastre/:id', (req, res) => {
    const { id } = req.params;
    const { articolo, codice, tag, gre, tot } = req.body;
    try {
      db.prepare('UPDATE piastre_at SET articolo = ?, codice = ?, tag = ?, gre = ?, tot = ? WHERE id = ?')
        .run(articolo, codice, tag, gre, tot, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/casse-at/porte', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM porte_at ORDER BY id ASC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/casse-at/porte/:id', (req, res) => {
    const { id } = req.params;
    const { articolo, codice, tag, gre, vern, tot } = req.body;
    try {
      db.prepare('UPDATE porte_at SET articolo = ?, codice = ?, tag = ?, gre = ?, vern = ?, tot = ? WHERE id = ?')
        .run(articolo, codice, tag, gre, vern, tot, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/casse-at/involucro', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM involucro_at ORDER BY id ASC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/casse-at/involucro/:id', (req, res) => {
    const { id } = req.params;
    const { articolo, codice, tag, gre, sald, vern, mag, tot } = req.body;
    try {
      db.prepare('UPDATE involucro_at SET articolo = ?, codice = ?, tag = ?, gre = ?, sald = ?, vern = ?, mag = ?, tot = ? WHERE id = ?')
        .run(articolo, codice, tag, gre, sald, vern, mag, tot, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/casse-at/complete', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM casse_complete_at ORDER BY id ASC').all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/casse-at/complete/:id', (req, res) => {
    const { id } = req.params;
    const { quantita, impegni, totale } = req.body;
    try {
      db.prepare('UPDATE casse_complete_at SET quantita = ?, impegni = ?, totale = ? WHERE id = ?')
        .run(quantita, impegni, totale, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Seed Casse AT tables if empty
  const seedCasseAT = () => {
    const piastreCount = db.prepare("SELECT COUNT(*) as count FROM piastre_at WHERE articolo != '' AND articolo IS NOT NULL").get() as any;
    if (true) { // Force re-seed to apply correct data
      db.prepare('DELETE FROM piastre_at').run();
      const piastreData = [
        { articolo: 'PIASTRA AT 200X300', codice: 'AT-PA0203' },
        { articolo: 'PIASTRA AT 250X300', codice: 'AT-PA2503' },
        { articolo: 'PIASTRA AT 300X300', codice: 'AT-PA0303' },
        { articolo: 'PIASTRA AT 300X400', codice: 'AT-PA0304' },
        { articolo: 'PIASTRA AT 300X500', codice: 'AT-PA0305' },
        { articolo: 'PIASTRA AT 400X300', codice: 'AT-PA0403' },
        { articolo: 'PIASTRA AT 400X400', codice: 'AT-PA0404' },
        { articolo: 'PIASTRA AT 400X500', codice: 'AT-PA0405' },
        { articolo: 'PIASTRA AT 400X600', codice: 'AT-PA0406' },
        { articolo: 'PIASTRA AT 500X500', codice: 'AT-PA0505' },
        { articolo: 'PIASTRA AT 500X700', codice: 'AT-PA0507' },
        { articolo: 'PIASTRA AT 600X400', codice: 'AT-PA0604' },
        { articolo: 'PIASTRA AT 600X600', codice: 'AT-PA0606' },
        { articolo: 'PIASTRA AT 600X800', codice: 'AT-PA0608' },
        { articolo: 'PIASTRA AT 600X1000', codice: 'AT-PA0610' },
        { articolo: 'PIASTRA AT 600X1200', codice: 'AT-PA0612' },
        { articolo: 'PIASTRA AT 800X600', codice: 'AT-PA0806' },
        { articolo: 'PIASTRA AT 800X800', codice: 'AT-PA0808' },
        { articolo: 'PIASTRA AT 800X1000', codice: 'AT-PA0810' },
        { articolo: 'PIASTRA AT 800X1200', codice: 'AT-PA0812' },
        { articolo: 'PIASTRA AT 1000X800', codice: 'AT-PA1008' },
        { articolo: 'PIASTRA AT 1000X1000', codice: 'AT-PA1010' },
        { articolo: 'PIASTRA AT 1000X1200', codice: 'AT-PA1012' },
        { articolo: 'PIASTRA AT 1000X1400', codice: 'AT-PA1014' },
        { articolo: 'PIASTRA AT 1200X800', codice: 'AT-PA1208' },
        { articolo: 'PIASTRA AT 1200X1000', codice: 'AT-PA1210' },
        { articolo: 'PIASTRA AT 1200X1200', codice: 'AT-PA1212' }
      ];
      const insert = db.prepare('INSERT INTO piastre_at (articolo, codice) VALUES (?, ?)');
      for (const p of piastreData) insert.run(p.articolo, p.codice);
      for (let i = piastreData.length; i < 60; i++) insert.run('', '');
    }

    const porteCount = db.prepare("SELECT COUNT(*) as count FROM porte_at WHERE articolo != '' AND articolo IS NOT NULL").get() as any;
    if (true) { // Force re-seed to apply correct data
      db.prepare('DELETE FROM porte_at').run();
      const porteData = [
        { articolo: 'PORTA AT 200X300', codice: 'AT-PO0203' },
        { articolo: 'PORTA AT 250X300', codice: 'AT-PO2503' },
        { articolo: 'PORTA AT 300X300', codice: 'AT-PO0303' },
        { articolo: 'PORTA AT 300X400', codice: 'AT-PO0304' },
        { articolo: 'PORTA AT 300X500', codice: 'AT-PO0305' },
        { articolo: 'PORTA AT 400X300', codice: 'AT-PO0403' },
        { articolo: 'PORTA AT 400X400', codice: 'AT-PO0404' },
        { articolo: 'PORTA AT 400X500', codice: 'AT-PO0405' },
        { articolo: 'PORTA AT 400X600', codice: 'AT-PO0406' },
        { articolo: 'PORTA AT 500X500', codice: 'AT-PO0505' },
        { articolo: 'PORTA AT 500X700', codice: 'AT-PO0507' },
        { articolo: 'PORTA AT 600X400', codice: 'AT-PO0604' },
        { articolo: 'PORTA AT 600X600', codice: 'AT-PO0606' },
        { articolo: 'PORTA AT 600X800', codice: 'AT-PO0608' },
        { articolo: 'PORTA AT 600X1000', codice: 'AT-PO0610' },
        { articolo: 'PORTA AT 600X1200', codice: 'AT-PO0612' },
        { articolo: 'PORTA AT 800X600', codice: 'AT-PO0806' },
        { articolo: 'PORTA AT 800X800', codice: 'AT-PO0808' },
        { articolo: 'PORTA AT 800X1000', codice: 'AT-PO0810' },
        { articolo: 'PORTA AT 800X1200', codice: 'AT-PO0812' },
        { articolo: 'PORTA AT 1000X800', codice: 'AT-PO1008' },
        { articolo: 'PORTA AT 1000X1000', codice: 'AT-PO1010' },
        { articolo: 'PORTA AT 1000X1200', codice: 'AT-PO1012' },
        { articolo: 'PORTA AT 1000X1400', codice: 'AT-PO1014' },
        { articolo: 'PORTA AT 1200X800', codice: 'AT-PO1208' },
        { articolo: 'PORTA AT 1200X1000', codice: 'AT-PO1210' },
        { articolo: 'PORTA AT 1200X1200', codice: 'AT-PO1212' }
      ];
      const insert = db.prepare('INSERT INTO porte_at (articolo, codice) VALUES (?, ?)');
      for (const p of porteData) insert.run(p.articolo, p.codice);
      for (let i = porteData.length; i < 100; i++) insert.run('', '');
    }

    const involucroCount = db.prepare("SELECT COUNT(*) as count FROM involucro_at WHERE articolo != '' AND articolo IS NOT NULL").get() as any;
    if (true) { // Force re-seed to apply correct data
      db.prepare('DELETE FROM involucro_at').run();
      const involucroData = [
        { articolo: 'INVOLUCRO AT 200X300X150', codice: 'AT-IN2315' },
        { articolo: 'INVOLUCRO AT 250X300X150', codice: 'AT-IN25315' },
        { articolo: 'INVOLUCRO AT 300X300X150', codice: 'AT-IN3315' },
        { articolo: 'INVOLUCRO AT 300X400X150', codice: 'AT-IN3415' },
        { articolo: 'INVOLUCRO AT 300X400X200', codice: 'AT-IN3420' },
        { articolo: 'INVOLUCRO AT 300X500X150', codice: 'AT-IN3515' },
        { articolo: 'INVOLUCRO AT 300X500X200', codice: 'AT-IN3520' },
        { articolo: 'INVOLUCRO AT 300X500X250', codice: 'AT-IN3525' },
        { articolo: 'INVOLUCRO AT 400X400X200', codice: 'AT-IN4420' },
        { articolo: 'INVOLUCRO AT 400X500X150', codice: 'AT-IN4515' },
        { articolo: 'INVOLUCRO AT 400X500X200', codice: 'AT-IN4520' },
        { articolo: 'INVOLUCRO AT 400X500X250', codice: 'AT-IN4525' },
        { articolo: 'INVOLUCRO AT 400X600X200', codice: 'AT-IN4620' },
        { articolo: 'INVOLUCRO AT 400X600X250', codice: 'AT-IN4625' },
        { articolo: 'INVOLUCRO AT 500X500X200', codice: 'AT-IN5520' },
        { articolo: 'INVOLUCRO AT 500X500X250', codice: 'AT-IN5525' },
        { articolo: 'INVOLUCRO AT 500X700X200', codice: 'AT-IN5720' },
        { articolo: 'INVOLUCRO AT 500X700X250', codice: 'AT-IN5725' },
        { articolo: 'INVOLUCRO AT 600X400X400', codice: 'AT-IN6440' },
        { articolo: 'INVOLUCRO AT 600X600X200', codice: 'AT-IN6620' },
        { articolo: 'INVOLUCRO AT 600X600X250', codice: 'AT-IN6625' },
        { articolo: 'INVOLUCRO AT 600X600X300', codice: 'AT-IN6630' },
        { articolo: 'INVOLUCRO AT 600X600X400', codice: 'AT-IN6640' },
        { articolo: 'INVOLUCRO AT 600X800X200', codice: 'AT-IN6820' },
        { articolo: 'INVOLUCRO AT 600X800X250', codice: 'AT-IN6825' },
        { articolo: 'INVOLUCRO AT 600X800X300', codice: 'AT-IN6830' },
        { articolo: 'INVOLUCRO AT 600X800X400', codice: 'AT-IN6840' },
        { articolo: 'INVOLUCRO AT 600X1000X250', codice: 'AT-IN61025' },
        { articolo: 'INVOLUCRO AT 600X1000X300', codice: 'AT-IN61030' },
        { articolo: 'INVOLUCRO AT 600X1000X400', codice: 'AT-IN61040' },
        { articolo: 'INVOLUCRO AT 600X1200X300', codice: 'AT-IN61230' },
        { articolo: 'INVOLUCRO AT 800X800X200', codice: 'AT-IN8820' },
        { articolo: 'INVOLUCRO AT 800X800X300', codice: 'AT-IN8830' },
        { articolo: 'INVOLUCRO AT 800X1000X250', codice: 'AT-IN81025' },
        { articolo: 'INVOLUCRO AT 800X1000X300', codice: 'AT-IN81030' },
        { articolo: 'INVOLUCRO AT 800X1200X300', codice: 'AT-IN81230' },
        { articolo: 'INVOLUCRO AT 1000X800X200', codice: 'AT-IN10820' },
        { articolo: 'INVOLUCRO AT 1000X1000X300', codice: 'AT-IN101030' },
        { articolo: 'INVOLUCRO AT 1000X1000X400', codice: 'AT-IN101040' },
        { articolo: 'INVOLUCRO AT 1000X1200X300', codice: 'AT-IN101230' },
        { articolo: 'INVOLUCRO AT 1000X1400X300', codice: 'AT-IN101430' },
        { articolo: 'INVOLUCRO AT 1200X1200X300', codice: 'AT-IN121230' }
      ];
      const insert = db.prepare('INSERT INTO involucro_at (articolo, codice) VALUES (?, ?)');
      for (const inv of involucroData) insert.run(inv.articolo, inv.codice);
      for (let i = involucroData.length; i < 120; i++) insert.run('', '');
    }

    const casseCompleteCount = db.prepare("SELECT COUNT(*) as count FROM casse_complete_at").get() as any;
    if (casseCompleteCount.count === 0) {
      const casseCompleteData = [
        'CASSA AT COMPL. 200X300X150', 'CASSA AT COMPL. 250X300X150', 'CASSA AT COMPL. 300X300X150',
        'CASSA AT COMPL. 300X400X150', 'CASSA AT COMPL. 300X400X200', 'CASSA AT COMPL. 300X500X150',
        'CASSA AT COMPL. 300X500X200', 'CASSA AT COMPL. 300X500X250', 'CASSA AT COMPL. 400X400X200',
        'CASSA AT COMPL. 400X500X150', 'CASSA AT COMPL. 400X500X200', 'CASSA AT COMPL. 400X500X250',
        'CASSA AT COMPL. 400X600X200', 'CASSA AT COMPL. 400X600X250', 'CASSA AT COMPL. 500X500X200',
        'CASSA AT COMPL. 500X500X250', 'CASSA AT COMPL. 500X700X200', 'CASSA AT COMPL. 500X700X250',
        'CASSA AT COMPL. 600X400X400', 'CASSA AT COMPL. 600X600X200', 'CASSA AT COMPL. 600X600X250',
        'CASSA AT COMPL. 600X600X300', 'CASSA AT COMPL. 600X600X400', 'CASSA AT COMPL. 600X800X200',
        'CASSA AT COMPL. 600X800X250', 'CASSA AT COMPL. 600X800X300', 'CASSA AT COMPL. 600X800X400',
        'CASSA AT COMPL. 600X1000X250', 'CASSA AT COMPL. 600X1000X300', 'CASSA AT COMPL. 600X1000X400',
        'CASSA AT COMPL. 600X1200X300', 'CASSA AT COMPL. 800X800X200', 'CASSA AT COMPL. 800X800X300',
        'CASSA AT COMPL. 800X1000X250', 'CASSA AT COMPL. 800X1000X300', 'CASSA AT COMPL. 800X1200X300',
        'CASSA AT COMPL. 1000X800X200', 'CASSA AT COMPL. 1000X1000X300', 'CASSA AT COMPL. 1000X1000X400',
        'CASSA AT COMPL. 1000X1200X300', 'CASSA AT COMPL. 1000X1400X300', 'CASSA AT COMPL. 1200X1200X300'
      ];
      const insert = db.prepare('INSERT INTO casse_complete_at (articolo) VALUES (?)');
      for (const art of casseCompleteData) {
        try {
          insert.run(art);
        } catch (e) {}
      }
    }
  };
  seedCasseAT();

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
      
      // Also update articles.piega to keep them in sync
      db.prepare('UPDATE articles SET piega = ? WHERE id = ?').run(piega, existing.articolo_id);
      
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
        SELECT m.id, a.nome as articolo_nome, a.codice as articolo_codice, m.fase, m.tipo, m.quantita, m.operatore, m.cliente, m.commessa, m.tempo, m.timestamp
        FROM movements_log m 
        JOIN articles a ON m.articolo_id = a.id
        ORDER BY m.timestamp DESC
      `).all();

      const headers = ['ID', 'Articolo', 'Codice', 'Fase', 'Tipo', 'Quantita', 'Operatore', 'Cliente', 'Commessa', 'Tempo (min)', 'Data'];
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
        m.tempo || '',
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

  app.post('/api/movements/import', (req, res) => {
    const movements = req.body;
    try {
      if (!Array.isArray(movements)) throw new Error("Formato dati non valido");

      const transaction = db.transaction(() => {
        const stmt = db.prepare(`
          INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa, timestamp) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of movements) {
          const qty = parseInt(m.quantita, 10);
          if (isNaN(qty) || qty < 0) continue;
          
          stmt.run(
            m.articolo_id, 
            m.fase || '', 
            m.tipo || '', 
            qty, 
            m.operatore || '', 
            m.cliente || '', 
            m.commessa || '',
            m.timestamp || new Date().toISOString()
          );
        }
      });

      transaction();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error importing movements:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/movements', (req, res) => {
    const { articolo_id, fase, tipo, quantita, operatore = '', quantita_lanciata, tempo } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty < 0) throw new Error("Quantità non valida");

      const transaction = db.transaction(() => {
        const executeMovement = (id: string | number, isAuto: boolean = false) => {
          // Fetch current processes
          const procRow = db.prepare(`SELECT * FROM processes WHERE articolo_id = ?`).get(id) as any;
          if (!procRow) throw new Error("Processi non trovati per questo articolo");
          
          // Fetch current article
          const artRow = db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id) as any;
          if (!artRow) throw new Error("Articolo non trovato");

          let { taglio, piega, saldatura, verniciatura } = procRow;
          let { verniciati, impegni_clienti } = artRow;

          const getCategory = (name: string, code?: string): string => {
            const upperName = name?.toUpperCase() || '';
            const upperCode = code?.toUpperCase() || '';
            
            if (upperName.includes('PORTA AT') || upperName.includes('PORTE AT') || upperCode.startsWith('AT-PO')) return 'PORTE AT';
            if (upperName.includes('PIASTRA AT') || upperName.includes('PIASTRE AT') || upperCode.startsWith('AT-PA')) return 'PIASTRE AT';
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
            if (upperName.includes('LATERALE')) {
              if (upperCode.includes('LB')) return 'Laterali Ibridi';
              return 'Laterali';
            }
            if (upperName.includes('TETTO') && !upperName.includes('STT AGR')) return 'Tetti';
            if (upperName.includes('PIASTRA')) {
              if (upperName.includes('LATERALE')) return 'Piastre Laterali';
              return 'Piastre Frontali';
            }

            if (upperName.includes('STRUTTURE AGR') || upperName.includes('STRUTTURA AGR') || upperName.includes('STT AGR') || upperCode.startsWith('AGR-ST') || upperCode.startsWith('AGT-ST') || /^AGR\d{4}$/.test(upperCode)) return 'Strutture Agr';
            if (upperName.includes('BASI&TETTI') || (upperName.includes('BASI') && upperName.includes('TETTI'))) return 'Basi&Tetti';
            if (upperName.includes('AGS')) return 'AGS';
            if (upperName.includes('AGC')) return 'AGC';
            if (upperName.includes('AGLM')) return 'AGLM';
            if (upperName.includes('AGLC')) return 'AGLC';
            if (upperName.includes('CRISTALLO') || upperName.includes('VETRO')) return 'Cristalli';
            return 'Senza Categoria';
          };

          const category = getCategory(artRow.nome, artRow.codice);
          const catLower = category.toLowerCase();
          
          if (fase === 'saldatura' || fase === 'verniciatura') {
            if (catLower.includes('piastre')) {
              throw new Error(`Non è possibile registrare movimenti in ${fase} per ${artRow.nome}. Le piastre hanno solo la fase di piegatura (grezzo).`);
            }
          }
          if (fase === 'saldatura') {
            if (tipo === 'carico' && (catLower.includes('porte') || catLower.includes('retri') || catLower.includes('tetti') || catLower.includes('laterali'))) {
              throw new Error(`Non è possibile aggiungere un carico alla saldatura per ${artRow.nome}. Questi articoli vanno saldati ma vengono registrati solo nel grezzo.`);
            }
          }

          const skipPiega = catLower.includes('porte') || catLower.includes('retri') || catLower.includes('laterali') || catLower.includes('tetti');

          const isTaglioEnabled = (cat: string) => {
            const c = cat.toLowerCase();
            if (c.includes('strutture agr') || c.includes('involucri at')) {
              return false;
            }
            return true;
          };

          const isSaldaturaEnabled = (cat: string) => {
            const c = cat.toLowerCase();
            if (c.includes('porte') || c.includes('retri') || c.includes('tetti') || c.includes('laterali') || c.includes('piastre')) {
              return false;
            }
            return true;
          };

          const isGrezzoEnabled = (cat: string) => {
            const c = cat.toLowerCase();
            if (c.includes('strutture agr') || c.includes('involucri at')) {
              return false;
            }
            return true;
          };

          const taglioEnabled = isTaglioEnabled(category);
          const saldaturaEnabled = isSaldaturaEnabled(category);
          const grezzoEnabled = isGrezzoEnabled(category);

          let prevVal = 0;
          let prevFase = null;
          if (tipo === 'carico') {
              if (fase === 'taglio' || fase === 'Tagliato - Carico da Macchina 5000') {
                  taglio += qty;
              } else if (fase === 'piega') {
                  piega += qty;
                  if (taglioEnabled) {
                      taglio -= qty; // Grezzo -> Tagliato
                      prevFase = 'taglio';
                  }
              } else if (fase === 'saldatura') {
                  saldatura += qty;
                  if (saldaturaEnabled) {
                      if (grezzoEnabled) {
                          piega -= qty; // Saldatura -> Grezzo
                          prevFase = 'piega';
                      } else {
                          // If grezzo is disabled, subtract from piega directly
                          piega -= qty;
                          prevFase = 'piega';
                      }
                  }

                  // Deduct traverses if it's an AGR structure
                  if (category === 'Strutture Agr' && /^AGR(\d{2})(\d{2})$/.test(artRow.codice)) {
                      const match = artRow.codice.match(/^AGR(\d{2})(\d{2})$/);
                      if (match) {
                          const w = parseInt(match[1]) * 100;
                          const h = parseInt(match[2]) * 100;
                          const needed = [
                              { tipo: 'forata', misura: w, q: qty * 2 },
                              { tipo: 'cieca', misura: h, q: qty * 2 },
                              { tipo: 'tetto1', misura: w, q: qty * 2 },
                              { tipo: 'tetto2', misura: h, q: qty * 2 }
                          ];
                          
                          for (const item of needed) {
                              const inv = db.prepare('SELECT quantita FROM traverse_inventory WHERE tipo = ? AND misura = ?').get(item.tipo, item.misura) as any;
                              if (!inv || inv.quantita < item.q) throw new Error(`Traverse insufficienti: ${item.tipo} ${item.misura}`);
                          }
                          
                          for (const item of needed) {
                              db.prepare('UPDATE traverse_inventory SET quantita = quantita - ? WHERE tipo = ? AND misura = ?').run(item.q, item.tipo, item.misura);
                          }
                      }
                  }
              } else if (fase === 'verniciatura') {
                  verniciatura += qty;
                  verniciati += qty;
                  if (saldaturaEnabled) {
                      saldatura -= qty; // Verniciato -> Saldatura
                      prevFase = 'saldatura';
                  } else if (grezzoEnabled) {
                      piega -= qty; // Verniciato -> Grezzo
                      prevFase = 'piega';
                  }
              } else if (fase === 'impegni') {
                  impegni_clienti += qty;
              }
          } else if (tipo === 'scarico') {
              if (fase === 'taglio') taglio -= qty;
              else if (fase === 'piega') piega -= qty;
              else if (fase === 'saldatura') {
                  saldatura -= qty;
                  // Add back traverses if it's an AGR structure
                  if (category === 'Strutture Agr' && /^AGR(\d{2})(\d{2})$/.test(artRow.codice)) {
                      const match = artRow.codice.match(/^AGR(\d{2})(\d{2})$/);
                      if (match) {
                          const w = parseInt(match[1]) * 100;
                          const h = parseInt(match[2]) * 100;
                          const needed = [
                              { tipo: 'forata', misura: w, q: qty * 2 },
                              { tipo: 'cieca', misura: h, q: qty * 2 },
                              { tipo: 'tetto1', misura: w, q: qty * 2 },
                              { tipo: 'tetto2', misura: h, q: qty * 2 }
                          ];
                          for (const item of needed) {
                              db.prepare('UPDATE traverse_inventory SET quantita = quantita + ? WHERE tipo = ? AND misura = ?').run(item.q, item.tipo, item.misura);
                          }
                      }
                  }
              }
              else if (fase === 'verniciatura') {
                  verniciatura -= qty;
                  verniciati -= qty;
              }
              else if (fase === 'impegni') impegni_clienti -= qty;
          } else if (tipo === 'rettifica') {
              if (fase === 'taglio') { prevVal = taglio; taglio = qty; }
              else if (fase === 'piega') { prevVal = piega; piega = qty; }
              else if (fase === 'saldatura') { prevVal = saldatura; saldatura = qty; }
              else if (fase === 'verniciatura') { prevVal = verniciatura; verniciatura = qty; verniciati = qty; }
              else if (fase === 'impegni') { prevVal = impegni_clienti; impegni_clienti = qty; }
          }

          // Update processes
          db.prepare(`UPDATE processes SET taglio = ?, piega = ?, saldatura = ?, verniciatura = ? WHERE articolo_id = ?`)
            .run(taglio, piega, saldatura, verniciatura, id);
          
          // Update articles
          db.prepare(`UPDATE articles SET verniciati = ?, impegni_clienti = ?, piega = ? WHERE id = ?`)
            .run(verniciati, impegni_clienti, piega, id);

          // Log the movement
          let logFase = isAuto ? `AUTO (${fase})` : fase;
          if (tipo === 'rettifica') {
              const faseShort = fase.substring(0, 3).toUpperCase();
              logFase = `${faseShort}. (${prevVal} PZ)`;
          } else if (tipo === 'scarico') {
              logFase = isAuto ? 'AUTO (Scarico)' : 'Scarico';
          }
          const logTipo = tipo === 'scarico' ? 'scarico da commessa' : tipo;

          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa, quantita_lanciata, tempo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, logFase, logTipo, qty, operatore, req.body.cliente || null, req.body.commessa || null, quantita_lanciata || null, tempo || null);

          // Log automatic scarico from previous phase if applicable
          if (prevFase) {
            db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa, quantita_lanciata, tempo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .run(id, prevFase, 'scarico', qty, operatore, req.body.cliente || null, req.body.commessa || null, quantita_lanciata || null, null);
          }

          // Sync components if it's a master AGR article
          if (!isAuto && /^AGR\d{4}$/.test(artRow.codice)) {
            const misura = artRow.codice.replace('AGR', '');
            const componentCodes = [`AGR-STB${misura}`, `AGR-STT${misura}`];
            
            for (const compCode of componentCodes) {
              const compArt = db.prepare('SELECT id FROM articles WHERE codice = ?').get(compCode) as any;
              if (compArt) {
                executeMovement(compArt.id, true);
              }
            }
          }
        };

        executeMovement(articolo_id);
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
          .run(articolo_id, fase_produzione, 'Carico Commessa', qty, operatore, cliente, commessa);

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
          let { articolo_id, codice_articolo, quantita, is_cassa_completa, cassa_id } = item;
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
          
          if (is_cassa_completa && cassa_id) {
            // Update casse_complete_at
            db.prepare(`UPDATE casse_complete_at SET impegni = impegni + ?, totale = totale - ? WHERE id = ?`).run(qty, qty, cassa_id);
          } else {
            // Update total impegni in articles
            db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qty, articolo_id);
          }

          // Log the movement
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(articolo_id, fase_produzione, 'Carico Commessa', qty, operatore, cliente, commessa);
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
    const { cliente, commessa, quantita, priorita, fase_produzione, operatore, note, stato_lavorazione, articolo_id } = req.body;
    
    // Check permissions
    const canEdit = ['lucaturati', 'adeleturati', 'robertobonalumi'].includes((operatore || '').toLowerCase());
    if (!canEdit && operatore) {
      return res.status(403).json({ error: "Non autorizzato a modificare gli impegni" });
    }

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

        const newArticoloId = articolo_id || oldCommitment.articolo_id;
        const articleChanged = newArticoloId !== oldCommitment.articolo_id;

        if (articleChanged && oldCommitment.stato_lavorazione !== 'Completato') {
          // Remove old quantity from old article
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti - ? WHERE id = ?`).run(oldCommitment.quantita, oldCommitment.articolo_id);
          // Add new quantity to new article
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(newQty, newArticoloId);
        } else if (!articleChanged && oldCommitment.stato_lavorazione !== 'Completato') {
          const qtyDiff = newQty - oldCommitment.quantita;
          if (qtyDiff !== 0) {
            db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qtyDiff, oldCommitment.articolo_id);
          }
        }

        db.prepare(`
          UPDATE commitments 
          SET cliente = ?, commessa = ?, quantita = ?, priorita = ?, fase_produzione = ?, operatore = ?, note = ?, stato_lavorazione = ?, articolo_id = ?, timestamp_modifica = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(
          cliente || oldCommitment.cliente, 
          commessa || oldCommitment.commessa, 
          newQty, 
          priorita ?? oldCommitment.priorita, 
          fase_produzione || oldCommitment.fase_produzione, 
          operatore || oldCommitment.operatore, 
          note !== undefined ? note : oldCommitment.note, 
          stato_lavorazione || oldCommitment.stato_lavorazione, 
          newArticoloId,
          id
        );
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
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti - ? WHERE id = ?`).run(fullCommitment.quantita, fullCommitment.articolo_id);
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
    const { commessa, ids, username } = req.body;
    try {
      const result = db.transaction(() => {
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

          const article = db.prepare('SELECT nome, codice, verniciati, piega, impegni_clienti FROM articles WHERE id = ?').get(articolo_id) as any;
          if (!article) continue;

          const process = db.prepare('SELECT id, taglio, piega, saldatura, verniciatura FROM processes WHERE articolo_id = ?').get(articolo_id) as any;
          
        const fase = (commitment.fase_produzione || 'generico').toLowerCase();
        let sourceFase = 'Scarico';

        if (fase === 'taglio') {
          sourceFase = 'TAG.';
          if (process) {
            db.prepare('UPDATE processes SET taglio = taglio - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'piega') {
          sourceFase = 'GRE.';
          db.prepare('UPDATE articles SET piega = piega - ? WHERE id = ?').run(qty, articolo_id);
          if (process) {
            db.prepare('UPDATE processes SET piega = piega - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'saldatura') {
          sourceFase = 'SALD.';
          if (process) {
            db.prepare('UPDATE processes SET saldatura = saldatura - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'verniciatura') {
          sourceFase = 'VER.';
          db.prepare('UPDATE articles SET verniciati = verniciati - ? WHERE id = ?').run(qty, articolo_id);
          if (process) {
            db.prepare('UPDATE processes SET verniciatura = verniciatura - ? WHERE id = ?').run(qty, process.id);
          }
        } else {
          // Generico
          const isPiastra = article.nome.toLowerCase().includes('piastra');
          if (isPiastra) {
            sourceFase = 'GRE.';
            db.prepare('UPDATE articles SET piega = piega - ? WHERE id = ?').run(qty, articolo_id);
            if (process) {
              db.prepare('UPDATE processes SET piega = piega - ? WHERE id = ?').run(qty, process.id);
            }
          } else {
            sourceFase = 'VER.';
            db.prepare('UPDATE articles SET verniciati = verniciati - ? WHERE id = ?').run(qty, articolo_id);
            if (process) {
              db.prepare('UPDATE processes SET verniciatura = verniciatura - ? WHERE id = ?').run(qty, process.id);
            }
          }
        }

        // Update impegni_clienti
        db.prepare('UPDATE articles SET impegni_clienti = impegni_clienti - ? WHERE id = ?').run(qty, articolo_id);

        // Update commitment status
        db.prepare("UPDATE commitments SET stato_lavorazione = 'Completato', timestamp_modifica = CURRENT_TIMESTAMP WHERE id = ?").run(commitment.id);

        // Log movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(articolo_id, sourceFase, 'scarico da commessa', qty, username || 'System', commitment.cliente, commitment.commessa);
        }
        return { success: true };
      })();

      res.json(result);
    } catch (error: any) {
      console.error("Fulfill commessa error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/:id/fulfill', async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    try {
      const result = db.transaction(() => {
        const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!commitment) throw new Error("Impegno non trovato");
        if (commitment.stato_lavorazione === 'Completato') throw new Error("Impegno già evaso");

        const qty = commitment.quantita;
        const articolo_id = commitment.articolo_id;

        const article = db.prepare('SELECT nome, codice, verniciati, piega, impegni_clienti FROM articles WHERE id = ?').get(articolo_id) as any;
        if (!article) throw new Error("Articolo non trovato");

        const process = db.prepare('SELECT id, taglio, piega, saldatura, verniciatura FROM processes WHERE articolo_id = ?').get(articolo_id) as any;
        
        const fase = (commitment.fase_produzione || 'generico').toLowerCase();
        let sourceFase = 'Scarico';

        if (fase === 'taglio') {
          sourceFase = 'TAG.';
          if (process) {
            db.prepare('UPDATE processes SET taglio = taglio - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'piega') {
          sourceFase = 'GRE.';
          db.prepare('UPDATE articles SET piega = piega - ? WHERE id = ?').run(qty, articolo_id);
          if (process) {
            db.prepare('UPDATE processes SET piega = piega - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'saldatura') {
          sourceFase = 'SALD.';
          if (process) {
            db.prepare('UPDATE processes SET saldatura = saldatura - ? WHERE id = ?').run(qty, process.id);
          }
        } else if (fase === 'verniciatura') {
          sourceFase = 'VER.';
          db.prepare('UPDATE articles SET verniciati = verniciati - ? WHERE id = ?').run(qty, articolo_id);
          if (process) {
            db.prepare('UPDATE processes SET verniciatura = verniciatura - ? WHERE id = ?').run(qty, process.id);
          }
        } else {
          // Generico
          const isPiastra = article.nome.toLowerCase().includes('piastra');
          if (isPiastra) {
            sourceFase = 'GRE.';
            db.prepare('UPDATE articles SET piega = piega - ? WHERE id = ?').run(qty, articolo_id);
            if (process) {
              db.prepare('UPDATE processes SET piega = piega - ? WHERE id = ?').run(qty, process.id);
            }
          } else {
            sourceFase = 'VER.';
            db.prepare('UPDATE articles SET verniciati = verniciati - ? WHERE id = ?').run(qty, articolo_id);
            if (process) {
              db.prepare('UPDATE processes SET verniciatura = verniciatura - ? WHERE id = ?').run(qty, process.id);
            }
          }
        }

        // Update impegni_clienti
        db.prepare('UPDATE articles SET impegni_clienti = impegni_clienti - ? WHERE id = ?').run(qty, articolo_id);

        // Update commitment status
        db.prepare("UPDATE commitments SET stato_lavorazione = 'Completato', timestamp_modifica = CURRENT_TIMESTAMP WHERE id = ?").run(id);

        // Log movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(articolo_id, sourceFase, 'scarico da commessa', qty, username || 'System', commitment.cliente, commitment.commessa);

        return { success: true };
      })();

      res.json(result);
    } catch (error: any) {
      console.error("Fulfill error:", error);
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
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti - ? WHERE id = ?`).run(commitment.quantita, commitment.articolo_id);
        }

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore, cliente, commessa) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(commitment.articolo_id, 'Scarico', 'scarico da commessa', commitment.quantita, operatore || 'System', commitment.cliente, commitment.commessa);

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

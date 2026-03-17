import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './server/db.ts';
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
if (existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
} else {
  console.warn('Firebase Admin: serviceAccountKey.json not found. Admin SDK not initialized.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const validUsers = ['LucaTurati', 'RobertoBonalumi', 'SamantaLimonta', 'TahaJbala', 'AdeleTurati'];
    
    if (!validUsers.includes(username)) {
      return res.status(401).json({ error: 'Utente non autorizzato' });
    }
    
    if (password !== 'Auger2014') {
      return res.status(401).json({ error: 'Password errata' });
    }

    res.json({ success: true, username });
  });

  // Articles CRUD
  app.get('/api/articles', (req, res) => {
    const articles = db.prepare(`
      SELECT a.*, p.piega 
      FROM articles a 
      LEFT JOIN processes p ON a.id = p.articolo_id
    `).all();
    res.json(articles);
  });

  app.post('/api/articles', (req, res) => {
    const { nome, codice, verniciati = 0, impegni_clienti = 0, prezzo = 0, scorta = 10 } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti, prezzo, scorta) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(nome, codice, verniciati, impegni_clienti, prezzo, scorta);
      
      // Create associated process record
      const processStmt = db.prepare('INSERT INTO processes (articolo_id) VALUES (?)');
      processStmt.run(info.lastInsertRowid);

      res.json({ id: info.lastInsertRowid, nome, codice, verniciati, impegni_clienti, prezzo, scorta });
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
    const { nome, codice, verniciati, impegni_clienti, prezzo, scorta } = req.body;
    try {
      const stmt = db.prepare('UPDATE articles SET nome = ?, codice = ?, verniciati = ?, impegni_clienti = ?, prezzo = ?, scorta = ? WHERE id = ?');
      stmt.run(nome, codice, verniciati, impegni_clienti, prezzo, scorta, id);
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
    const clients = db.prepare('SELECT * FROM clients ORDER BY nome ASC').all();
    res.json(clients);
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
    const processes = db.prepare(`
      SELECT p.*, a.nome as articolo_nome, a.codice as articolo_codice 
      FROM processes p 
      JOIN articles a ON p.articolo_id = a.id
    `).all();
    res.json(processes);
  });

  app.put('/api/processes/:id', (req, res) => {
    const { id } = req.params;
    const { taglio, piega, verniciatura } = req.body;
    try {
      const stmt = db.prepare('UPDATE processes SET taglio = ?, piega = ?, verniciatura = ? WHERE id = ?');
      stmt.run(taglio, piega, verniciatura, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Movements
  app.get('/api/movements', (req, res) => {
    const movements = db.prepare(`
      SELECT m.*, a.nome as articolo_nome, a.codice as articolo_codice 
      FROM movements_log m 
      JOIN articles a ON m.articolo_id = a.id
      ORDER BY m.timestamp DESC
    `).all();
    res.json(movements);
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

        let { taglio, piega, verniciatura } = procRow;
        let { verniciati, impegni_clienti } = artRow;

        if (tipo === 'carico') {
            if (fase === 'taglio') {
                taglio += qty;
            } else if (fase === 'piega') {
                piega += qty;
                taglio -= qty; // Scala dal taglio (può andare in negativo)
            } else if (fase === 'verniciatura') {
                verniciatura += qty;
                verniciati += qty;
                piega -= qty; // Scala dalla piega (può andare in negativo)
            } else if (fase === 'impegni') {
                impegni_clienti += qty;
            }
        } else if (tipo === 'scarico') {
            if (fase === 'taglio') taglio -= qty;
            else if (fase === 'piega') piega -= qty;
            else if (fase === 'verniciatura') {
                verniciatura -= qty;
                verniciati -= qty;
            }
            else if (fase === 'impegni') impegni_clienti -= qty;
        } else if (tipo === 'rettifica') {
            if (fase === 'taglio') taglio = qty;
            else if (fase === 'piega') piega = qty;
            else if (fase === 'verniciatura') {
                verniciatura = qty;
                verniciati = qty;
            }
            else if (fase === 'impegni') impegni_clienti = qty;
        }

        // Update processes
        db.prepare(`UPDATE processes SET taglio = ?, piega = ?, verniciatura = ? WHERE articolo_id = ?`)
          .run(taglio, piega, verniciatura, articolo_id);
        
        // Update articles
        db.prepare(`UPDATE articles SET verniciati = ?, impegni_clienti = ?, piega = ? WHERE id = ?`)
          .run(verniciati, impegni_clienti, piega, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore) VALUES (?, ?, ?, ?, ?)`)
          .run(articolo_id, fase, tipo, qty, operatore);
      });
      
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Commitments (Impegni)
  app.get('/api/commitments', (req, res) => {
    const commitments = db.prepare(`
      SELECT c.*, a.nome as articolo_nome, a.codice as articolo_codice 
      FROM commitments c 
      JOIN articles a ON c.articolo_id = a.id
      ORDER BY c.data_inserimento DESC
    `).all();
    res.json(commitments);
  });

  app.post('/api/commitments', async (req, res) => {
    const { articolo_id, cliente, commessa, quantita, fase_produzione = 'Generico', operatore = '', note = '', stato_lavorazione = 'Pianificato' } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantità non valida");

      let newCommitmentId: number | bigint = 0;
      const transaction = db.transaction(() => {
        // Create commitment
        const stmt = db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita, fase_produzione, operatore, note, stato_lavorazione) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        const info = stmt.run(articolo_id, cliente, commessa, qty, fase_produzione, operatore, note, stato_lavorazione);
        newCommitmentId = info.lastInsertRowid;
        
        // Update total impegni in articles
        db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qty, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore) VALUES (?, ?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_creazione', 'carico', qty, operatore);

        return newCommitmentId;
      });

      const id = transaction();
      
      res.json({ id, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/commitments/:id', async (req, res) => {
    const { id } = req.params;
    const { cliente, commessa, quantita, fase_produzione, operatore, note, stato_lavorazione } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantità non valida");

      const transaction = db.transaction(() => {
        const oldCommitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!oldCommitment) throw new Error("Impegno non trovato");

        const qtyDiff = qty - oldCommitment.quantita;

        db.prepare(`
          UPDATE commitments 
          SET cliente = ?, commessa = ?, quantita = ?, fase_produzione = ?, operatore = ?, note = ?, stato_lavorazione = ?, timestamp_modifica = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(cliente, commessa, qty, fase_produzione, operatore, note, stato_lavorazione || oldCommitment.stato_lavorazione, id);

        if (qtyDiff !== 0) {
          db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qtyDiff, oldCommitment.articolo_id);
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

        db.prepare(`UPDATE articles SET impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`).run(fullCommitment.quantita, fullCommitment.articolo_id);
        db.prepare('DELETE FROM commitments WHERE id = ?').run(id);
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

          // Delete the commitment
          db.prepare('DELETE FROM commitments WHERE id = ?').run(commitment.id);

          // Log the movement
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore) VALUES (?, ?, ?, ?, ?)`)
            .run(articolo_id, 'impegni_evasione_commessa', 'scarico', qty, 'System');
            
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

        // Delete the commitment
        db.prepare('DELETE FROM commitments WHERE id = ?').run(id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita, operatore) VALUES (?, ?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_evasione', 'scarico', qty, 'System');
          
        fullCommitment = { ...commitment, articolo_nome: article.nome };
      });

      transaction();
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import db from './server/db.ts';

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
    const articles = db.prepare('SELECT * FROM articles').all();
    res.json(articles);
  });

  app.post('/api/articles', (req, res) => {
    const { nome, codice, verniciati = 0, impegni_clienti = 0 } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO articles (nome, codice, verniciati, impegni_clienti) VALUES (?, ?, ?, ?)');
      const info = stmt.run(nome, codice, verniciati, impegni_clienti);
      
      // Create associated process record
      const processStmt = db.prepare('INSERT INTO processes (articolo_id) VALUES (?)');
      processStmt.run(info.lastInsertRowid);

      res.json({ id: info.lastInsertRowid, nome, codice, verniciati, impegni_clienti });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    const { nome, codice, verniciati, impegni_clienti } = req.body;
    try {
      const stmt = db.prepare('UPDATE articles SET nome = ?, codice = ?, verniciati = ?, impegni_clienti = ? WHERE id = ?');
      stmt.run(nome, codice, verniciati, impegni_clienti, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    const { nome } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO clients (nome) VALUES (?)');
      const info = stmt.run(nome);
      res.json({ id: info.lastInsertRowid, nome });
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
    const { nome } = req.body;
    try {
      const stmt = db.prepare('UPDATE clients SET nome = ? WHERE id = ?');
      stmt.run(nome, id);
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
  app.post('/api/movements', (req, res) => {
    const { articolo_id, fase, tipo, quantita } = req.body;
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
        db.prepare(`UPDATE articles SET verniciati = ?, impegni_clienti = ? WHERE id = ?`)
          .run(verniciati, impegni_clienti, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita) VALUES (?, ?, ?, ?)`)
          .run(articolo_id, fase, tipo, qty);
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

  app.post('/api/commitments', (req, res) => {
    const { articolo_id, cliente, commessa, quantita } = req.body;
    try {
      const qty = parseInt(quantita, 10);
      if (isNaN(qty) || qty <= 0) throw new Error("Quantità non valida");

      const transaction = db.transaction(() => {
        // Create commitment
        const stmt = db.prepare('INSERT INTO commitments (articolo_id, cliente, commessa, quantita) VALUES (?, ?, ?, ?)');
        const info = stmt.run(articolo_id, cliente, commessa, qty);
        
        // Update total impegni in articles
        db.prepare(`UPDATE articles SET impegni_clienti = impegni_clienti + ? WHERE id = ?`).run(qty, articolo_id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita) VALUES (?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_creazione', 'carico', qty);

        return info.lastInsertRowid;
      });

      const id = transaction();
      res.json({ id, success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/fulfill-by-commessa', (req, res) => {
    const { commessa } = req.body;
    try {
      const transaction = db.transaction(() => {
        const commitments = db.prepare('SELECT * FROM commitments WHERE commessa = ?').all(commessa) as any[];
        
        if (commitments.length === 0) {
          throw new Error("Nessun impegno trovato per questa commessa");
        }

        for (const commitment of commitments) {
          const qty = commitment.quantita;
          const articolo_id = commitment.articolo_id;

          // Deduct from verniciati and impegni_clienti in articles
          db.prepare(`UPDATE articles SET verniciati = MAX(0, verniciati - ?), impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`)
            .run(qty, qty, articolo_id);

          // Deduct from verniciatura in processes
          db.prepare(`UPDATE processes SET verniciatura = MAX(0, verniciatura - ?) WHERE articolo_id = ?`)
            .run(qty, articolo_id);

          // Delete the commitment
          db.prepare('DELETE FROM commitments WHERE id = ?').run(commitment.id);

          // Log the movement
          db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita) VALUES (?, ?, ?, ?)`)
            .run(articolo_id, 'impegni_evasione_commessa', 'scarico', qty);
        }
      });

      transaction();
      res.json({ success: true, message: "Commessa evasa con successo" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/commitments/:id/fulfill', (req, res) => {
    const { id } = req.params;
    try {
      const transaction = db.transaction(() => {
        const commitment = db.prepare('SELECT * FROM commitments WHERE id = ?').get(id) as any;
        if (!commitment) throw new Error("Impegno non trovato");

        const qty = commitment.quantita;
        const articolo_id = commitment.articolo_id;

        // Deduct from verniciati and impegni_clienti in articles
        db.prepare(`UPDATE articles SET verniciati = MAX(0, verniciati - ?), impegni_clienti = MAX(0, impegni_clienti - ?) WHERE id = ?`)
          .run(qty, qty, articolo_id);

        // Deduct from verniciatura in processes
        db.prepare(`UPDATE processes SET verniciatura = MAX(0, verniciatura - ?) WHERE articolo_id = ?`)
          .run(qty, articolo_id);

        // Delete the commitment
        db.prepare('DELETE FROM commitments WHERE id = ?').run(id);

        // Log the movement
        db.prepare(`INSERT INTO movements_log (articolo_id, fase, tipo, quantita) VALUES (?, ?, ?, ?)`)
          .run(articolo_id, 'impegni_evasione', 'scarico', qty);
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

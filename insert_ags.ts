import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const agsList = [
  { nome: "STRUTTURA AGS 600X1600X400", codice: "AGS061604" },
  { nome: "STRUTTURA AGS 600X1800X400", codice: "AGS061804" },
  { nome: "STRUTTURA AGS 600X1800X500", codice: "AGS061805" },
  { nome: "STRUTTURA AGS 600X1800X600", codice: "AGS061806" },
  { nome: "STRUTTURA AGS 600X2000X400", codice: "AGS062004" },
  { nome: "STRUTTURA AGS 600X2000X500", codice: "AGS062005" },
  { nome: "STRUTTURA AGS 600X2000X600", codice: "AGS062006" },
  { nome: "STRUTTURA AGS 800X1600X400", codice: "AGS081604" },
  { nome: "STRUTTURA AGS 800X1600X500", codice: "AGS081605" },
  { nome: "STRUTTURA AGS 800X1800X400", codice: "AGS081804" },
  { nome: "STRUTTURA AGS 800X1800X500", codice: "AGS081805" },
  { nome: "STRUTTURA AGS 800X1800X600", codice: "AGS081806" },
  { nome: "STRUTTURA AGS 800X2000X400", codice: "AGS082004" },
  { nome: "STRUTTURA AGS 800X2000X500", codice: "AGS082005" },
  { nome: "STRUTTURA AGS 800X2000X600", codice: "AGS082006" },
  { nome: "STRUTTURA AGS 1000X1600X400", codice: "AGS101604" },
  { nome: "STRUTTURA AGS 1000X1600X500", codice: "AGS101605" },
  { nome: "STRUTTURA AGS 1000X1600X600", codice: "AGS101606" },
  { nome: "STRUTTURA AGS 1000X1800X400", codice: "AGS101804" },
  { nome: "STRUTTURA AGS 1000X1800X500", codice: "AGS101805" },
  { nome: "STRUTTURA AGS 1000X1800X600", codice: "AGS101806" },
  { nome: "STRUTTURA AGS 1000X2000X400", codice: "AGS102004" },
  { nome: "STRUTTURA AGS 1000X2000X500", codice: "AGS102005" },
  { nome: "STRUTTURA AGS 1000X2000X600", codice: "AGS102006" },
  { nome: "STRUTTURA AGS 1200X1600X400", codice: "AGS121604" },
  { nome: "STRUTTURA AGS 1200X1600X500", codice: "AGS121605" },
  { nome: "STRUTTURA AGS 1200X1800X400", codice: "AGS121804" },
  { nome: "STRUTTURA AGS 1200X1800X500", codice: "AGS121805" },
  { nome: "STRUTTURA AGS 1200X1800X600", codice: "AGS121806" },
  { nome: "STRUTTURA AGS 1200X2000X400", codice: "AGS122004" },
  { nome: "STRUTTURA AGS 1200X2000X500", codice: "AGS122005" },
  { nome: "STRUTTURA AGS 1200X2000X600", codice: "AGS122006" }
];

try {
  const insertArticle = db.prepare("INSERT INTO articles (nome, codice, verniciati, impegni_clienti, scorta) VALUES (?, ?, 0, 0, 0)");
  const insertProcess = db.prepare("INSERT INTO processes (articolo_id, taglio, piega, saldatura) VALUES (?, 0, 0, 0)");

  for (const ags of agsList) {
    const existing = db.prepare("SELECT id FROM articles WHERE codice = ?").get(ags.codice);
    if (!existing) {
      const info = insertArticle.run(ags.nome, ags.codice);
      insertProcess.run(info.lastInsertRowid);
      console.log(`Inserted ${ags.nome}`);
    }
  }
} catch (e) {
  console.error(e);
}

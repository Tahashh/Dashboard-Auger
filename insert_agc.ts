import Database from 'better-sqlite3';

const db = new Database('database.sqlite');

const agcList = [
  { nome: "STRUTTURA AGC 600X1200X400", codice: "AGC061204" },
  { nome: "STRUTTURA AGC 600X1400X300", codice: "AGC061403" },
  { nome: "STRUTTURA AGC 800X1200X400", codice: "AGC081204" },
  { nome: "STRUTTURA AGC 800X1400X300", codice: "AGC081403" },
  { nome: "STRUTTURA AGC 800X1400X400", codice: "AGC081404" },
  { nome: "STRUTTURA AGC 1000X1200X400", codice: "AGC101204" },
  { nome: "STRUTTURA AGC 1000X1400X400", codice: "AGC101404" },
  { nome: "STRUTTURA AGC 1200X1200X400", codice: "AGC121204" },
  { nome: "STRUTTURA AGC 1200X1400X300", codice: "AGC121403" },
  { nome: "STRUTTURA AGC 1200X1400X400", codice: "AGC121404" },
  { nome: "STRUTTURA AGC 1400X1200X400", codice: "AGC141204" },
  { nome: "STRUTTURA AGC 1400X1400X400", codice: "AGC141404" }
];

try {
  const insertArticle = db.prepare("INSERT INTO articles (nome, codice, verniciati, impegni_clienti, scorta) VALUES (?, ?, 0, 0, 0)");
  const insertProcess = db.prepare("INSERT INTO processes (articolo_id, taglio, piega, saldatura) VALUES (?, 0, 0, 0)");

  for (const agc of agcList) {
    const info = insertArticle.run(agc.nome, agc.codice);
    insertProcess.run(info.lastInsertRowid);
    console.log(`Inserted ${agc.nome}`);
  }
} catch (e) {
  console.error(e);
}
